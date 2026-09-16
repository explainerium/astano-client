"use client"

import { useTranslations } from "next-intl"
import { useState } from "react"
import Link from "next/link"
import { CircleCheck, FileUp, Loader2, TriangleAlert } from "lucide-react"
import { toast } from "sonner"
import EditorHeader from "@/components/dashboard/shell/EditorHeader"
import Panel from "@/components/dashboard/shell/Panel"
import { Button } from "@/components/ui/button"
import {
	useAnalysePriceListMutation,
	useRunPriceListImportMutation,
} from "@/redux/api/priceListApi"
import type { PriceListAnalysis, PriceListReport } from "@/types/priceList"
import { cn } from "@/lib/utils"

/**
 * Importing the ERP's price list.
 *
 * A separate page from the product import, because it is a different file
 * doing a different job: one row per article, list and quantity, and no mapping
 * to agree — the columns are fixed. It writes prices and quantity ladders onto
 * products that already exist and touches nothing else.
 *
 * Nothing is written until the last button. The preview runs the real import
 * with the writes skipped, so what it reports is what will happen.
 */

const Stat = ({ label, value, tone }: { label: string; value: number | string; tone?: string }) => (
	<div className="bg-card rounded-lg border p-4">
		<p className={cn("text-2xl font-semibold tabular-nums", tone)}>{value}</p>
		<p className="text-muted-foreground mt-0.5 text-xs">{label}</p>
	</div>
)

const ReportView = ({ report }: { report: PriceListReport }) => {
	const [showAll, setShowAll] = useState(false)

	// Ladders with a note first: eight of this catalogue's dealer ladders start
	// at 50, and that is the one thing on this page worth reading twice.
	const notable = report.ladders.filter((l) => l.issues.length)
	const ladders = showAll ? report.ladders : notable

	const written = Object.values(report.laddersWritten).reduce((sum, n) => sum + (n ?? 0), 0)

	return (
		<div className="space-y-4">
			<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
				<Stat label={report.dryRun ? "Ladders that would be written" : "Ladders written"} value={written} tone="text-positive" />
				<Stat label="Quantity steps" value={report.rungsWritten} />
				<Stat label="Articles matched" value={report.articlesMatched} />
				<Stat
					label="Rows that could not be read"
					value={report.unreadableRows}
					tone={report.unreadableRows ? "text-destructive" : undefined}
				/>
			</div>

			<div className="bg-accent-soft space-y-1 rounded-lg border p-4 text-sm">
				<p>
					<strong>{report.articlesNotInShop.length} articles in the file are not in this shop</strong>{" "}
					<span className="text-muted-foreground">— ignored, nothing is created.</span>
				</p>
				{report.quoteOnlyProducts.length > 0 && (
					<p>
						<strong>{report.quoteOnlyProducts.length} products stay on request</strong>{" "}
						<span className="text-muted-foreground">
							— they now carry a price, but “Preis auf Anfrage” is unchanged.
						</span>
					</p>
				)}
			</div>

			{notable.length === 0 && !showAll && (
				<p className="text-muted-foreground flex items-center gap-2 rounded-lg border border-dashed p-6 text-sm">
					<CircleCheck className="size-4" />
					Every ladder read cleanly — nothing to look at.
				</p>
			)}

			{ladders.length > 0 && (
				<div className="overflow-x-auto rounded-lg border">
					<table className="w-full text-sm">
						<thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
							<tr>
								<th className="px-4 py-2.5 text-left font-medium">Article</th>
								<th className="w-28 px-4 py-2.5 text-left font-medium">Price for</th>
								<th className="w-28 px-4 py-2.5 text-right font-medium">From</th>
								<th className="w-20 px-4 py-2.5 text-right font-medium">Steps</th>
								<th className="px-4 py-2.5 text-left font-medium">Notes</th>
							</tr>
						</thead>
						<tbody className="divide-y">
							{ladders.map((ladder) => (
								<tr key={`${ladder.sku}-${ladder.role}`}>
									<td className="px-4 py-2 font-mono text-xs">{ladder.sku}</td>
									<td className="px-4 py-2">{ladder.role === "RESELLER" ? "Dealers" : "Everyone"}</td>
									<td className="px-4 py-2 text-right tabular-nums">{ladder.basePrice}</td>
									<td className="px-4 py-2 text-right tabular-nums">{ladder.rungs}</td>
									<td className="text-muted-foreground px-4 py-2 text-xs">
										{ladder.issues.join("; ") || (ladder.quoteOnly ? "Stays on request" : "—")}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}

			{report.ladders.length > ladders.length && (
				<Button variant="outline" size="sm" onClick={() => setShowAll(true)}>
					Show all {report.ladders.length} ladders
				</Button>
			)}
		</div>
	)
}

export default function ImportPricesPage() {
	const t = useTranslations("admin")
	const [file, setFile] = useState<File | null>(null)
	const [analysis, setAnalysis] = useState<PriceListAnalysis | null>(null)
	const [preview, setPreview] = useState<PriceListReport | null>(null)
	const [result, setResult] = useState<PriceListReport | null>(null)

	const [analyse, { isLoading: analysing }] = useAnalysePriceListMutation()
	const [runImport, { isLoading: running }] = useRunPriceListImportMutation()

	const choose = async (chosen: File) => {
		setFile(chosen)
		setPreview(null)
		setResult(null)

		try {
			setAnalysis(await analyse({ file: chosen }).unwrap())
		} catch (error) {
			setAnalysis(null)
			const message = (error as { data?: { message?: string } })?.data?.message
			toast.error(message ?? t("couldNotReadThatFile"))
		}
	}

	const run = async (dryRun: boolean) => {
		if (!file || !analysis) return

		try {
			const report = await runImport({ file, delimiter: analysis.delimiter, dryRun }).unwrap()

			if (dryRun) {
				setPreview(report)
				setResult(null)
			} else {
				setResult(report)
				setPreview(null)
				toast.success(
					`${Object.values(report.laddersWritten).reduce((sum, n) => sum + (n ?? 0), 0)} price ladders imported.`
				)
			}
		} catch (error) {
			const message = (error as { data?: { message?: string } })?.data?.message
			toast.error(message ?? t("theImportFailed"))
		}
	}

	const busy = analysing || running

	return (
		<div className="space-y-6">
			<EditorHeader
				backHref="/admin/dashboard/products"
				backLabel={t("allProducts")}
				title="Import prices from the ERP"
				description="One row per article, price list and quantity — ARTIKELNR, PREISLISTE, MENGE, VKPREIS. Prices and quantity steps are written onto products that already exist; nothing is created, and names, pictures and “on request” are left alone."
			/>

			<Panel title="1 · The file">
				<div className="space-y-3">
					<label className="border-input hover:border-primary/50 flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed p-8 text-center transition-colors">
						<FileUp className="text-muted-foreground size-6" />
						<span className="text-sm font-medium">{file ? file.name : t("chooseACsvFile")}</span>
						<span className="text-muted-foreground text-xs">
							Straight from Mein Büro — Windows-1252 and German decimals are read as they are.
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
							{t("reading")}
						</p>
					)}

					{analysis && (
						<div className="space-y-2 text-sm">
							<p className="text-muted-foreground">
								{analysis.rowCount} rows · {analysis.articlesInFile} articles, of which{" "}
								<strong className="text-foreground">{analysis.articlesInShop}</strong> are in this shop
							</p>
							<ul className="text-muted-foreground space-y-0.5 text-xs">
								{analysis.lists.map((list) => (
									<li key={list.list}>
										<span className="font-medium">{list.list}</span> — {list.rows} rows ·{" "}
										{list.role === "RESELLER"
											? "dealer prices"
											: list.role
												? "everyone's prices"
												: "not a list this shop prices for, ignored"}
									</li>
								))}
							</ul>
							{analysis.unreadableRows > 0 && (
								<p className="text-destructive text-xs">
									{analysis.unreadableRows} rows could not be read and will be skipped.
								</p>
							)}
						</div>
					)}
				</div>
			</Panel>

			{analysis && (
				<>
					<div className="flex flex-wrap items-center justify-between gap-3">
						<Button asChild variant="ghost">
							<Link href="/admin/dashboard/products">{t("cancel")}</Link>
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
							{t("importMayTakeMinutes")}
						</p>
					)}

					{preview && (
						<Panel title="Preview — nothing has been written">
							<ReportView report={preview} />
						</Panel>
					)}

					{result && (
						<Panel title="Imported">
							<ReportView report={result} />
						</Panel>
					)}
				</>
			)}
		</div>
	)
}
