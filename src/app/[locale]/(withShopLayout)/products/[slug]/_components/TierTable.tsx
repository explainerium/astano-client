"use client"

import { useLocale, useTranslations } from "next-intl"
import { formatMoney } from "@/lib/money"
import { cn } from "@/lib/utils"
import type { PublicVariant } from "@/types/storefront"

/**
 * "Mehr kaufen, mehr sparen" — the quantity ladder for this variant.
 *
 * Every unit price in here was resolved by the server for the visitor's own
 * role. The only thing decided locally is which row to highlight, and that is
 * a comparison of quantities, not of money.
 */
export const TierTable = ({
	tiers,
	quantity,
	baseRow,
}: {
	tiers: PublicVariant["tiers"]
	quantity: number
	/**
	 * The opening row — what a unit costs before any tier applies. Null when
	 * the MOQ already sits at or above the first threshold, in which case the
	 * ladder starts at that threshold and there is nothing below it.
	 */
	baseRow: { minQuantity: number; unitPrice: string | null } | null
}) => {
	const t = useTranslations("shop")
	const locale = useLocale()

	if (!tiers.length) return null

	const rows = (baseRow ? [baseRow, ...tiers] : tiers).filter(
		(row, index, all) => all.findIndex((r) => r.minQuantity === row.minQuantity) === index
	)

	// The applicable row is the last threshold the quantity has reached.
	const activeIndex = rows.reduce(
		(found, row, index) => (quantity >= row.minQuantity ? index : found),
		-1
	)

	return (
		<div>
			<h2 className="font-heading mb-3 text-base font-semibold">{t("buyMoreSaveMore")}</h2>
			<table className="w-full border-collapse text-sm">
				<thead>
					<tr className="border-b text-left">
						<th scope="col" className="text-muted-foreground py-2 font-medium">
							{t("tierQuantity")}
						</th>
						<th scope="col" className="text-muted-foreground py-2 text-right font-medium">
							{t("tierPrice")}
						</th>
					</tr>
				</thead>
				<tbody>
					{rows.map((row, index) => (
						<tr
							key={row.minQuantity}
							className={cn(
								"border-b",
								index === activeIndex && "bg-tier-active/10 text-tier-active font-semibold"
							)}
						>
							<td className="py-2">
								{row.minQuantity}
								{index < rows.length - 1 ? `–${rows[index + 1].minQuantity - 1}` : "+"}
							</td>
							<td className="py-2 text-right">{formatMoney(row.unitPrice, locale) ?? "—"}</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	)
}

export default TierTable
