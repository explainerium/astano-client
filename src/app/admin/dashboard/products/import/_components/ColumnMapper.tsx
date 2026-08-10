"use client"

import { CircleCheck, CircleSlash } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { AnalyseResult } from "@/types/productIo"
import { cn } from "@/lib/utils"

/**
 * Which of our fields each of their columns is.
 *
 * This is the step that makes "any CSV" true. A WooCommerce export arrives with
 * most of it filled in, so the usual job is to glance down it — which is why
 * the sample value sits beside each row: recognising a column by its contents
 * is faster than recognising it by its name, especially in a language the admin
 * may not read.
 */
export const ColumnMapper = ({
	analysis,
	mapping,
	onChange,
}: {
	analysis: AnalyseResult
	mapping: Record<string, string>
	onChange: (mapping: Record<string, string>) => void
}) => {
	// Handled by shape rather than by the admin — the count is a property of
	// their file, so there is nothing here to decide.
	const attributeHeaders = new Set(
		analysis.attributeColumns.flatMap((a) => [a.nameHeader, a.valueHeader])
	)

	const used = new Set(Object.values(mapping).filter(Boolean))
	const sample = analysis.sample[0] ?? {}

	const set = (header: string, field: string) => {
		const next = { ...mapping }
		if (field) next[header] = field
		else delete next[header]
		onChange(next)
	}

	return (
		<div className="space-y-3">
			<div className="flex flex-wrap items-center gap-2 text-sm">
				<Badge variant="secondary" className="gap-1 font-normal">
					<CircleCheck className="size-3" />
					{Object.keys(mapping).length} mapped
				</Badge>
				{analysis.attributeColumns.length > 0 && (
					<Badge variant="secondary" className="font-normal">
						{analysis.attributeColumns.length} attribute columns detected
					</Badge>
				)}
				<span className="text-muted-foreground">
					Anything left as “Ignore” is not imported.
				</span>
			</div>

			<div className="overflow-x-auto rounded-lg border">
				<table className="w-full text-sm">
					<thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
						<tr>
							<th className="px-4 py-2.5 text-left font-medium">Column in your file</th>
							<th className="px-4 py-2.5 text-left font-medium">First row</th>
							<th className="w-64 px-4 py-2.5 text-left font-medium">Import as</th>
						</tr>
					</thead>
					<tbody className="divide-y">
						{analysis.headers.map((header) => {
							const isAttribute = attributeHeaders.has(header)
							const value = sample[header] ?? ""

							return (
								<tr key={header} className={cn(isAttribute && "bg-muted/30")}>
									<td className="px-4 py-2 font-medium">{header}</td>
									<td className="text-muted-foreground max-w-xs truncate px-4 py-2 text-xs">
										{value || "—"}
									</td>
									<td className="px-4 py-2">
										{isAttribute ? (
											<span className="text-muted-foreground inline-flex items-center gap-1.5 text-xs">
												<CircleCheck className="size-3.5" />
												Product attribute
											</span>
										) : (
											<select
												value={mapping[header] ?? ""}
												onChange={(event) => set(header, event.target.value)}
												className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm"
												aria-label={`Import ${header} as`}
											>
												<option value="">Ignore</option>
												{analysis.fields.map((field) => (
													<option
														key={field.key}
														value={field.key}
														// A field already taken by another column, unless
														// this is the column that took it.
														disabled={used.has(field.key) && mapping[header] !== field.key}
													>
														{field.label}
													</option>
												))}
											</select>
										)}
									</td>
								</tr>
							)
						})}
					</tbody>
				</table>
			</div>

			{!Object.values(mapping).includes("sku") && (
				<p className="text-muted-foreground flex items-start gap-2 text-sm">
					<CircleSlash className="mt-0.5 size-4 shrink-0" />
					No column is mapped to SKU. Without one, nothing can be matched to a product that
					already exists and every row creates a new one.
				</p>
			)}
		</div>
	)
}

export default ColumnMapper
