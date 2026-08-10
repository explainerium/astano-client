"use client"

import { Plus, Trash2, Wand2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
	STANDARD_LADDER,
	TIER_TYPE_LABELS,
	TIER_TYPES,
	tierUnitPrice,
	type TierType,
} from "@/lib/tiers"
import useMoney from "@/lib/useMoney"
export interface LadderRung {
	minQuantity: number
	type: TierType
	amount: string
}

/**
 * One quantity ladder, edited as a table.
 *
 * Deliberately uncontrolled by react-hook-form: the product editor keeps its
 * ladders inside one big form, but a category and a customer each edit a ladder
 * on its own, and wiring those through a form library only to save three fields
 * would be machinery without a purpose. This takes a value and an onChange, and
 * the three screens that use it stay the same shape as each other.
 *
 * `base` is what a percentage or amount-off rung is measured against, and it is
 * only ever used for the preview column. Pass null where there is no single
 * base — a category ladder covers products with different prices, so there is
 * nothing honest to preview and the column says so rather than inventing one.
 */
export const TierLadderEditor = ({
	value,
	onChange,
	base,
	baseHint,
	disabled,
}: {
	value: LadderRung[]
	onChange: (rows: LadderRung[]) => void
	base?: number | null
	/** Shown in the preview column when `base` is null, to explain the dashes. */
	baseHint?: string
	disabled?: boolean
}) => {
	// The shop's own separators and symbol. A function rather than an import,
	// so React Compiler can see that these prices depend on it.
	const formatMoney = useMoney()


	const sorted = (rows: LadderRung[]) =>
		[...rows].sort((a, b) => (a.minQuantity ?? 0) - (b.minQuantity ?? 0))

	const patch = (index: number, changes: Partial<LadderRung>) =>
		onChange(value.map((row, i) => (i === index ? { ...row, ...changes } : row)))

	/** 100 → 250 → 500 …, so Add follows the ladder the shop actually uses. */
	const nextQuantity = () => {
		const highest = value.reduce((max, row) => Math.max(max, row.minQuantity ?? 0), 0)
		if (!highest) return STANDARD_LADDER[0]
		return STANDARD_LADDER.find((rung) => rung > highest) ?? highest + 1000
	}

	const addRow = () =>
		onChange(sorted([...value, { minQuantity: nextQuantity(), type: "FIXED_PRICE", amount: "" }]))

	const addStandardLadder = () => {
		const have = new Set(value.map((row) => row.minQuantity))
		onChange(
			sorted([
				...value,
				...STANDARD_LADDER.filter((rung) => !have.has(rung)).map((minQuantity) => ({
					minQuantity,
					type: "FIXED_PRICE" as const,
					amount: "",
				})),
			])
		)
	}

	/**
	 * Re-sorts on blur, never on keystroke. Sorting while a threshold is being
	 * typed would move the row out from under the cursor between "1" and "100".
	 */
	const sortOnBlur = () => {
		const next = sorted(value)
		if (next.some((row, i) => row !== value[i])) onChange(next)
	}

	/**
	 * Which rows are cheaper than a smaller order.
	 *
	 * Only computable when there is a base to resolve against, and only a
	 * warning: a ladder that rises may be a genuine mistake or a deliberate
	 * surcharge, and this screen is not the place to refuse it.
	 */
	const risingRows = new Set<number>()
	if (base !== null && base !== undefined) {
		let previous = base
		for (const { row, index } of sorted(value).map((row) => ({
			row,
			index: value.indexOf(row),
		}))) {
			const amount = row.amount.trim()
			if (!amount) continue
			const unit = tierUnitPrice(base, row.type, Number(amount))
			if (unit === null) continue
			if (unit > previous + 1e-9) risingRows.add(index)
			previous = unit
		}
	}

	return (
		<div className="space-y-3">
			<div className="flex justify-end gap-2">
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={addStandardLadder}
					disabled={disabled}
				>
					<Wand2 />
					Standard ladder
				</Button>
				<Button type="button" variant="outline" size="sm" onClick={addRow} disabled={disabled}>
					<Plus />
					Add row
				</Button>
			</div>

			{!value.length ? (
				<p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-xs">
					No quantity discounts here. The normal price applies at every quantity.
				</p>
			) : (
				<div className="overflow-x-auto">
					<table className="w-full min-w-2xl text-sm">
						{/* Discount type first: it decides how the next column is read,
						    so choosing it before typing a number is the order the
						    thinking happens in. */}
						<thead>
							<tr className="text-muted-foreground text-left text-xs uppercase">
								<th className="w-44 pb-2 font-medium">Discount type</th>
								<th className="w-36 pb-2 font-medium">Amount</th>
								<th className="w-40 pb-2 font-medium">Minimum quantity</th>
								<th className="pb-2 font-medium">
									Per unit
									<span className="block text-[10px] normal-case">what the customer pays</span>
								</th>
								<th className="w-12 pb-2" />
							</tr>
						</thead>
						<tbody>
							{value.map((row, index) => {
								const amount = row.amount.trim()
								const unit =
									amount && base !== null && base !== undefined
										? tierUnitPrice(base, row.type, Number(amount))
										: null
								const suffix = TIER_TYPES.find((t) => t.value === row.type)?.suffix ?? ""

								return (
									<tr key={index}>
										<td className="py-1 pr-3 align-top">
											<Select
												value={row.type}
												onValueChange={(next) => patch(index, { type: next as TierType })}
												disabled={disabled}
											>
												<SelectTrigger className="w-full">
													<SelectValue />
												</SelectTrigger>
												<SelectContent>
													{TIER_TYPES.map((t) => (
														<SelectItem key={t.value} value={t.value}>
															{t.label}
														</SelectItem>
													))}
													{/* A rung migrated as amount-off keeps its own option so
													    opening the row cannot silently change its meaning. */}
													{row.type === "FIXED_AMOUNT" && (
														<SelectItem value="FIXED_AMOUNT">
															{TIER_TYPE_LABELS.FIXED_AMOUNT}
														</SelectItem>
													)}
												</SelectContent>
											</Select>
										</td>
										<td className="py-1 pr-3 align-top">
											<Input
												value={row.amount}
												onChange={(e) => patch(index, { amount: e.target.value })}
												placeholder={row.type === "PERCENTAGE" ? "0" : "0.00"}
												disabled={disabled}
											/>
										</td>
										<td className="py-1 pr-3 align-top">
											<Input
												type="number"
												min={1}
												value={row.minQuantity || ""}
												onChange={(e) =>
													patch(index, { minQuantity: Number(e.target.value) || 0 })
												}
												onBlur={sortOnBlur}
												disabled={disabled}
											/>
										</td>

										<td className="text-muted-foreground py-1 pr-3 align-top text-xs">
											<div className="flex h-9 flex-col justify-center">
												{unit !== null ? (
													<span className="flex items-center gap-1.5">
														<span
															className={cn(
																"font-medium tabular-nums",
																risingRows.has(index) ? "text-destructive" : "text-foreground"
															)}
														>
															{formatMoney(unit)}
														</span>
														<span className="text-[10px]">{suffix}</span>
													</span>
												) : (
													<span className="text-[10px]">{baseHint ?? "—"}</span>
												)}
												{risingRows.has(index) && (
													<span className="text-destructive text-[10px]">
														Dearer than a smaller order
													</span>
												)}
											</div>
										</td>

										<td className="py-1 align-top">
											<Button
												type="button"
												variant="ghost"
												size="icon"
												className="text-muted-foreground hover:text-destructive"
												aria-label={`Remove row ${index + 1}`}
												onClick={() => onChange(value.filter((_, i) => i !== index))}
												disabled={disabled}
											>
												<Trash2 />
											</Button>
										</td>
									</tr>
								)
							})}
						</tbody>
					</table>
				</div>
			)}
		</div>
	)
}

export default TierLadderEditor
