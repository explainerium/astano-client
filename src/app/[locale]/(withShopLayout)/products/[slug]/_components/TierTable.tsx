"use client"

import { useTranslations } from "next-intl"
import useMoney from "@/lib/useMoney"
import { cn } from "@/lib/utils"
import type { PublicVariant } from "@/types/storefront"

/**
 * "Mehr kaufen, mehr sparen" — the quantity ladder.
 *
 * Three columns, matching the live shop's own configuration: quantity range,
 * the saving as a percentage, and the unit price. The saving is derived here
 * rather than stored, because it is a *presentation* of two prices the server
 * already resolved — computing it server-side would mean shipping a number that
 * can be got from two others.
 *
 * Every unit price was resolved by the server for the visitor's own role. The
 * only things decided locally are which row to highlight and what the discount
 * reads as, and neither is money.
 */
export const TierTable = ({
	tiers,
	quantity,
	baseRow,
	title,
	compact,
}: {
	tiers: PublicVariant["tiers"]
	quantity: number
	/**
	 * The opening row — what a unit costs before any tier applies. Null when
	 * the MOQ already sits at or above the first threshold, in which case the
	 * ladder starts at that threshold and there is nothing below it.
	 */
	baseRow: { minQuantity: number; unitPrice: string | null } | null
	/** Overrides the heading. Options name themselves rather than repeat it. */
	title?: string
	/** Denser type and padding, for a table nested inside an option row. */
	compact?: boolean
}) => {
	// The shop's own separators and symbol. A function rather than an import,
	// so React Compiler can see that these prices depend on it.
	const formatMoney = useMoney()

	const t = useTranslations("shop")

	if (!tiers.length) return null

	const rows = (baseRow ? [baseRow, ...tiers] : tiers).filter(
		(row, index, all) => all.findIndex((r) => r.minQuantity === row.minQuantity) === index
	)

	// The applicable row is the last threshold the quantity has reached.
	const activeIndex = rows.reduce(
		(found, row, index) => (quantity >= row.minQuantity ? index : found),
		-1
	)

	/**
	 * The saving against the opening price, as a whole percent.
	 *
	 * Measured from the first row rather than from the row above, so every line
	 * answers the same question — "how much cheaper than buying one?" — instead
	 * of a chain the reader has to add up. Blank on the opening row itself,
	 * because nothing is saved there.
	 */
	const opening = Number(rows[0]?.unitPrice ?? Number.NaN)
	const savingOf = (unitPrice: string | null): string | null => {
		const value = Number(unitPrice ?? Number.NaN)
		if (Number.isNaN(opening) || Number.isNaN(value) || opening <= 0) return null
		const percent = Math.round(((opening - value) / opening) * 100)
		return percent > 0 ? `−${percent}%` : null
	}

	return (
		<div>
			<h2
				className={cn(
					"font-heading font-semibold",
					compact ? "mb-2 text-sm" : "mb-3 text-base"
				)}
			>
				{title ?? t("buyMoreSaveMore")}
			</h2>

			<div className="overflow-x-auto border">
				<table className="w-full border-collapse text-sm">
					<thead>
						{/* A filled header bar rather than a rule: this table sits among
						    other blocks on a long page, and a header that reads as a
						    header is what makes it scannable at a glance. */}
						<tr className="bg-muted text-left">
							<th
								scope="col"
								className={cn(
									"text-muted-foreground text-xs font-semibold tracking-wide uppercase",
									compact ? "px-3 py-2" : "px-4 py-2.5"
								)}
							>
								{t("tierQuantity")}
							</th>
							<th
								scope="col"
								className={cn(
									"text-muted-foreground text-right text-xs font-semibold tracking-wide uppercase",
									compact ? "px-3 py-2" : "px-4 py-2.5"
								)}
							>
								{t("tierDiscount")}
							</th>
							<th
								scope="col"
								className={cn(
									"text-muted-foreground text-right text-xs font-semibold tracking-wide uppercase",
									compact ? "px-3 py-2" : "px-4 py-2.5"
								)}
							>
								{t("tierPrice")}
							</th>
						</tr>
					</thead>
					<tbody>
						{rows.map((row, index) => {
							const saving = savingOf(row.unitPrice)
							const isActive = index === activeIndex
							const cell = compact ? "px-3 py-1.5" : "px-4 py-2.5"

							return (
								<tr
									key={row.minQuantity}
									// The live shop paints the matching row solid #ff4d00 on
									// black text; --tier-active carries both.
									className={cn(
										"border-t",
										isActive && "bg-tier-active text-tier-active-foreground font-semibold"
									)}
								>
									<td className={cn(cell, "tabular-nums")}>
										{row.minQuantity}
										{index < rows.length - 1 ? `–${rows[index + 1].minQuantity - 1}` : "+"}
									</td>
									<td
										className={cn(
											cell,
											"text-right tabular-nums",
											!isActive && "text-muted-foreground"
										)}
									>
										{saving ?? "—"}
									</td>
									<td className={cn(cell, "text-right font-medium tabular-nums")}>
										{formatMoney(row.unitPrice) ?? "—"}
									</td>
								</tr>
							)
						})}
					</tbody>
				</table>
			</div>
		</div>
	)
}

export default TierTable
