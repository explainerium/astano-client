"use client"

import { useState } from "react"
import Link from "next/link"
import { FileUp, Loader2, TriangleAlert } from "lucide-react"
import { toast } from "sonner"
import EditorHeader from "@/components/dashboard/shell/EditorHeader"
import Panel from "@/components/dashboard/shell/Panel"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { useAnalyseImportMutation, useRunImportMutation } from "@/redux/api/productIoApi"
import type { AnalyseResult, ImportOptions, ImportReport } from "@/types/productIo"
import ColumnMapper from "./_components/ColumnMapper"
import ImportReportView from "./_components/ImportReportView"

/**
 * Importing a product CSV.
 *
 * Three steps on one page — choose the file, agree the columns, look at what it
 * would do — because they are one task and a wizard that hides the earlier
 * steps makes correcting a mapping mean starting again.
 *
 * Nothing is written until the last button. The preview runs the real import
 * with writes turned off, so what it reports is what will happen rather than an
 * estimate of it.
 */

const DEFAULT_OPTIONS: ImportOptions = {
	quoteWhenNoPrice: true,
	downloadImages: false,
	onExisting: "update",
	onNew: "create",
}

const Option = ({
	checked,
	onChange,
	label,
	description,
}: {
	checked: boolean
	onChange: (value: boolean) => void
	label: string
	description: string
}) => (
	<label className="flex cursor-pointer items-start gap-3">
		<Checkbox checked={checked} onCheckedChange={(value) => onChange(value === true)} className="mt-0.5" />
		<span>
			<span className="text-sm font-medium">{label}</span>
			<span className="text-muted-foreground block text-xs">{description}</span>
		</span>
	</label>
)

export default function ImportProductsPage() {
	const [file, setFile] = useState<File | null>(null)
	const [analysis, setAnalysis] = useState<AnalyseResult | null>(null)
	const [mapping, setMapping] = useState<Record<string, string>>({})
	const [options, setOptions] = useState<ImportOptions>(DEFAULT_OPTIONS)
	const [preview, setPreview] = useState<ImportReport | null>(null)
	const [result, setResult] = useState<ImportReport | null>(null)

	const [analyse, { isLoading: analysing }] = useAnalyseImportMutation()
	const [runImport, { isLoading: running }] = useRunImportMutation()

	const choose = async (chosen: File) => {
		setFile(chosen)
		setPreview(null)
		setResult(null)

		try {
			const data = await analyse({ file: chosen }).unwrap()
			setAnalysis(data)
			setMapping(data.mapping)

			toast.success(
				`${data.rowCount} rows, ${Object.keys(data.mapping).length} of ${data.headers.length} columns recognised.`
			)
		} catch (error) {
			setAnalysis(null)
			const message = (error as { data?: { message?: string } })?.data?.message
			toast.error(message ?? "Could not read that file.")
		}
	}

	const run = async (dryRun: boolean) => {
		if (!file || !analysis) return

		try {
			const report = await runImport({
				file,
				mapping,
				options,
				delimiter: analysis.delimiter,
				dryRun,
			}).unwrap()

			if (dryRun) {
				setPreview(report)
				setResult(null)
			} else {
				setResult(report)
				setPreview(null)
				toast.success(`${report.created + report.updated} products imported.`)
			}
		} catch (error) {
			const message = (error as { data?: { message?: string } })?.data?.message
			toast.error(message ?? "The import failed.")
		}
	}

	const busy = analysing || running

	return (
		<div className="space-y-6">
			<EditorHeader
				backHref="/admin/dashboard/products"
				backLabel="All products"
				title="Import products"
				description="Any CSV. Rows are matched to products by SKU — a match is updated, anything else is created."
			/>

			<Panel title="1 · The file">
				<div className="space-y-3">
					<label className="border-input hover:border-primary/50 flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed p-8 text-center transition-colors">
						<FileUp className="text-muted-foreground size-6" />
						<span className="text-sm font-medium">
							{file ? file.name : "Choose a CSV file"}
						</span>
						<span className="text-muted-foreground text-xs">
							Comma, semicolon or tab separated. UTF-8.
						</span>
						<input
							type="file"
							accept=".csv,text/csv"
							className="hidden"
							onChange={(event) => {
								const chosen = event.target.files?.[0]
								if (chosen) void choose(chosen)
							}}
						/>
					</label>

					{analysing && (
						<p className="text-muted-foreground text-sm">
							<Loader2 className="mr-2 inline size-4 animate-spin" />
							Reading…
						</p>
					)}

					{analysis && (
						<p className="text-muted-foreground text-sm">
							{analysis.rowCount} rows · {analysis.headers.length} columns · separated by{" "}
							{analysis.delimiter === "\t" ? "tab" : `“${analysis.delimiter}”`}
						</p>
					)}
				</div>
			</Panel>

			{analysis && (
				<>
					<Panel title="2 · The columns">
						<ColumnMapper analysis={analysis} mapping={mapping} onChange={setMapping} />
					</Panel>

					<Panel title="3 · How to import">
						<div className="space-y-4">
							<Option
								checked={options.quoteWhenNoPrice}
								onChange={(quoteWhenNoPrice) => setOptions((o) => ({ ...o, quoteWhenNoPrice }))}
								label="A row with no price is price-on-request"
								description="Without this a product with an empty price column imports as costing nothing."
							/>
							<Option
								checked={options.onExisting === "update"}
								onChange={(update) =>
									setOptions((o) => ({ ...o, onExisting: update ? "update" : "skip" }))
								}
								label="Update products that already exist"
								description="Matched by SKU. Only the columns you mapped are written; the rest are left alone."
							/>
							<Option
								checked={options.onNew === "create"}
								onChange={(create) => setOptions((o) => ({ ...o, onNew: create ? "create" : "skip" }))}
								label="Create products that are not in the catalogue"
								description="Turn off to update existing products only — a price list, say."
							/>
							<Option
								checked={options.downloadImages}
								onChange={(downloadImages) => setOptions((o) => ({ ...o, downloadImages }))}
								label="Download the images"
								description="Fetches every image URL into the media library. Considerably slower, and an image that cannot be fetched is reported rather than failing its row."
							/>
						</div>
					</Panel>

					<div className="flex flex-wrap items-center justify-between gap-3">
						<Button asChild variant="ghost">
							<Link href="/admin/dashboard/products">Cancel</Link>
						</Button>

						<div className="flex flex-wrap gap-2">
							<Button variant="outline" disabled={busy} onClick={() => run(true)}>
								{running && preview === null ? <Loader2 className="animate-spin" /> : null}
								Preview
							</Button>
							<Button disabled={busy} onClick={() => run(false)}>
								{running ? <Loader2 className="animate-spin" /> : null}
								Import
							</Button>
						</div>
					</div>

					{running && (
						<p className="text-muted-foreground flex items-start gap-2 text-sm">
							<TriangleAlert className="mt-0.5 size-4 shrink-0" />
							This can take a few minutes for a large file, and longer again with images
							turned on. Leave the page open.
						</p>
					)}

					{preview && (
						<Panel title="Preview — nothing has been written">
							<ImportReportView report={preview} />
						</Panel>
					)}

					{result && (
						<Panel title="Imported">
							<ImportReportView report={result} />
						</Panel>
					)}
				</>
			)}
		</div>
	)
}
