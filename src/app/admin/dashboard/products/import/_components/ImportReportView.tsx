"use client"

import { useState } from "react"
import { CircleAlert, CircleCheck, CirclePlus, CircleSlash, RefreshCw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { ImportReport, RowAction } from "@/types/productIo"
import { cn } from "@/lib/utils"

const ACTION: Record<RowAction, { label: string; icon: typeof CircleCheck; tone: string }> = {
	created: { label: "New", icon: CirclePlus, tone: "text-positive" },
	updated: { label: "Updated", icon: RefreshCw, tone: "text-primary" },
	skipped: { label: "Skipped", icon: CircleSlash, tone: "text-muted-foreground" },
	failed: { label: "Failed", icon: CircleAlert, tone: "text-destructive" },
}

const Stat = ({ label, value, tone }: { label: string; value: number; tone?: string }) => (
	<div className="bg-card rounded-lg border p-4">
		<p className={cn("text-2xl font-semibold tabular-nums", tone)}>{value}</p>
		<p className="text-muted-foreground mt-0.5 text-xs">{label}</p>
	</div>
)

/**
 * What happened, or what would happen.
 *
 * The same component for the preview and the result, because they are the same
 * report — a dry run goes through the identical code and differs only in not
 * writing. Showing them differently would invite the reader to trust one more
 * than the other.
 */
export const ImportReportView = ({ report }: { report: ImportReport }) => {
	const [showAll, setShowAll] = useState(false)

	// Everything that failed, then everything with a note, then the quiet ones.
	// A hundred successful rows should not push one failure off the screen.
	const notable = report.rows.filter((r) => r.action === "failed" || r.issues.length)
	const rows = showAll ? report.rows : notable.slice(0, 50)

	return (
		<div className="space-y-4">
			<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
				<Stat label={report.dryRun ? "Would be new" : "Created"} value={report.created} tone="text-positive" />
				<Stat label={report.dryRun ? "Would be updated" : "Updated"} value={report.updated} />
				<Stat label="Skipped" value={report.skipped} />
				<Stat
					label="Failed"
					value={report.failed}
					tone={report.failed ? "text-destructive" : undefined}
				/>
			</div>

			{(report.categoriesCreated.length > 0 || report.attributesCreated.length > 0) && (
				<div className="bg-accent-soft space-y-2 rounded-lg border p-4 text-sm">
					{report.categoriesCreated.length > 0 && (
						<p>
							<strong>
								{report.categoriesCreated.length} categories{" "}
								{report.dryRun ? "would be created" : "created"}:
							</strong>{" "}
							<span className="text-muted-foreground">
								{report.categoriesCreated.join(" · ")}
							</span>
						</p>
					)}
					{report.attributesCreated.length > 0 && (
						<p>
							<strong>
								{report.attributesCreated.length} attributes{" "}
								{report.dryRun ? "would be created" : "created"}:
							</strong>{" "}
							<span className="text-muted-foreground">
								{report.attributesCreated.join(", ")}
							</span>
						</p>
					)}
				</div>
			)}

			{(report.imagesFetched > 0 || report.imagesFailed > 0) && (
				<p className="text-muted-foreground text-sm">
					Images: {report.imagesFetched} fetched
					{report.imagesFailed > 0 && `, ${report.imagesFailed} could not be`}.
				</p>
			)}

			{notable.length === 0 && !showAll && (
				<p className="text-muted-foreground flex items-center gap-2 rounded-lg border border-dashed p-6 text-sm">
					<CircleCheck className="size-4" />
					Every row read cleanly — nothing to report.
				</p>
			)}

			{rows.length > 0 && (
				<div className="overflow-x-auto rounded-lg border">
					<table className="w-full text-sm">
						<thead className="bg-muted/50 text-muted-foreground text-xs uppercase">
							<tr>
								<th className="w-16 px-4 py-2.5 text-left font-medium">Row</th>
								<th className="w-28 px-4 py-2.5 text-left font-medium">Result</th>
								<th className="px-4 py-2.5 text-left font-medium">Product</th>
								<th className="px-4 py-2.5 text-left font-medium">Notes</th>
							</tr>
						</thead>
						<tbody className="divide-y">
							{rows.map((row) => {
								const meta = ACTION[row.action]
								const Icon = meta.icon

								return (
									<tr key={row.line}>
										<td className="text-muted-foreground px-4 py-2 tabular-nums">{row.line}</td>
										<td className="px-4 py-2">
											<span className={cn("inline-flex items-center gap-1.5 text-xs", meta.tone)}>
												<Icon className="size-3.5" />
												{meta.label}
											</span>
										</td>
										<td className="px-4 py-2">
											{row.name ?? <span className="text-muted-foreground">—</span>}
											{row.sku && (
												<span className="text-muted-foreground ml-2 font-mono text-xs">
													{row.sku}
												</span>
											)}
										</td>
										<td className="text-muted-foreground px-4 py-2 text-xs">
											{row.issues.join("; ") || "—"}
										</td>
									</tr>
								)
							})}
						</tbody>
					</table>
				</div>
			)}

			{report.rows.length > rows.length && (
				<Button variant="outline" size="sm" onClick={() => setShowAll(true)}>
					Show all {report.rows.length} rows
				</Button>
			)}

			{notable.length > 50 && !showAll && (
				<Badge variant="outline" className="font-normal">
					{notable.length - 50} more rows with notes
				</Badge>
			)}
		</div>
	)
}

export default ImportReportView
