"use client"

import { useFieldArray, useFormContext } from "react-hook-form"
import { Plus, Trash2, Wand2 } from "lucide-react"
import ProInput from "@/components/form/ProInput"
import { Button } from "@/components/ui/button"

/** The rungs every priced product on the live site uses (§4.2). */
export const STANDARD_LADDER = [100, 250, 500, 1000, 2000, 3000, 4000, 5000]

type TierRow = { minQuantity?: number; retail: string; reseller: string }

/**
 * "Buy more, save more" — one table, one row per quantity, a price column for
 * retail and one for dealers. This is how §4.2 lays the real data out and how
 * the client reads it.
 *
 * Two things were deliberately taken away from the earlier version:
 *
 * - **The discount-type dropdown.** Every tier in the live shop is a fixed
 *   price — the amount *is* what a unit costs at that quantity. The engine
 *   still supports percentage-off and amount-off; nothing has ever used them,
 *   and three ways to express one number is where a non-technical admin makes
 *   a mistake that is invisible until a customer is undercharged.
 * - **The Guest / Retail / Reseller tabs.** Guests and signed-in retail
 *   customers pay the same price here, so retail is a single column. The API
 *   can still price them apart if that is ever wanted.
 */
export const QuantityPricing = () => {
	const { control, getValues } = useFormContext()
	const { fields, append, remove, replace } = useFieldArray({ control, name: "tiers" })

	const rows = () => (getValues("tiers") ?? []) as TierRow[]

	const emptyRow = (minQuantity: number): TierRow => ({ minQuantity, retail: "", reseller: "" })

	/** 100 → 250 → 500 …, so clicking Add follows the ladder the shop uses. */
	const nextQuantity = () => {
		const highest = rows().reduce((max, row) => Math.max(max, row.minQuantity ?? 0), 0)
		if (!highest) return STANDARD_LADDER[0]
		return STANDARD_LADDER.find((rung) => rung > highest) ?? highest + 1000
	}

	const addStandardLadder = () => {
		const existing = rows()
		const have = new Set(existing.map((row) => row.minQuantity))
		replace(
			[...existing, ...STANDARD_LADDER.filter((rung) => !have.has(rung)).map(emptyRow)].sort(
				(a, b) => (a.minQuantity ?? 0) - (b.minQuantity ?? 0)
			)
		)
	}

	/**
	 * Runs on blur, never on keystroke: replace() remounts every row, and
	 * re-sorting mid-typing would pull the field out from under the cursor.
	 */
	const sortRows = () => {
		const current = rows()
		const sorted = [...current].sort((a, b) => (a.minQuantity ?? 0) - (b.minQuantity ?? 0))
		if (sorted.some((row, index) => row !== current[index])) replace(sorted)
	}

	return (
		<div className="space-y-3">
			<div className="flex flex-wrap items-end justify-between gap-3">
				<div>
					<h3 className="text-sm font-medium">Quantity discounts</h3>
					<p className="text-muted-foreground mt-1 max-w-prose text-xs">
						The price per unit once the customer orders that many. Each row
						applies from its quantity upwards, and the last row covers
						everything above it. Below the first row, the regular price applies.
					</p>
				</div>
				<div className="flex gap-2">
					<Button type="button" variant="outline" size="sm" onClick={addStandardLadder}>
						<Wand2 />
						Standard ladder
					</Button>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => append(emptyRow(nextQuantity()))}
					>
						<Plus />
						Add row
					</Button>
				</div>
			</div>

			{!fields.length ? (
				<p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-xs">
					No quantity discounts. Every order pays the regular price.
				</p>
			) : (
				<div className="overflow-x-auto">
					<table className="w-full min-w-xl text-sm">
						<thead>
							<tr className="text-muted-foreground text-left text-xs uppercase">
								<th className="w-40 pb-2 font-medium">Quantity from</th>
								<th className="pb-2 font-medium">
									Retail price
									<span className="block text-[10px] normal-case">
										per unit
									</span>
								</th>
								<th className="pb-2 font-medium">
									Reseller price
									<span className="block text-[10px] normal-case">
										per unit — leave empty for none
									</span>
								</th>
								<th className="w-12 pb-2" />
							</tr>
						</thead>
						<tbody>
							{fields.map((field, index) => (
								<tr key={field.id}>
									<td className="py-1 pr-3 align-top">
										<ProInput
											name={`tiers.${index}.minQuantity`}
											type="number"
											onBlurExtra={sortRows}
										/>
									</td>
									<td className="py-1 pr-3 align-top">
										<ProInput name={`tiers.${index}.retail`} placeholder="0.00" />
									</td>
									<td className="py-1 pr-3 align-top">
										<ProInput name={`tiers.${index}.reseller`} placeholder="—" />
									</td>
									<td className="py-1 align-top">
										<Button
											type="button"
											variant="ghost"
											size="icon"
											className="text-muted-foreground hover:text-destructive"
											aria-label={`Remove row ${index + 1}`}
											onClick={() => remove(index)}
										>
											<Trash2 />
										</Button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	)
}

export default QuantityPricing
