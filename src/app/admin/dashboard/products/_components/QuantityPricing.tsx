"use client"

import { useTranslations } from "next-intl"
import { useState } from "react"
import { useFieldArray, useFormContext, useWatch } from "react-hook-form"
import { Plus, Trash2, Wand2 } from "lucide-react"
import ProInput from "@/components/form/ProInput"
import ProSelect from "@/components/form/ProSelect"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import {
	STANDARD_LADDER,
	TIER_ROLES,
	TIER_TYPE_LABELS,
	TIER_TYPES,
	tierUnitPrice,
	type TierRole,
	type TierType,
} from "@/lib/tiers"
import useMoney from "@/lib/useMoney"
type TierRow = {
	minQuantity?: number
	type: TierType
	amount: string
}


const TYPE_OPTIONS = TIER_TYPES.map((t) => ({ value: t.value, label: t.label }))

/**
 * The options a given row may show.
 *
 * `FIXED_AMOUNT` is no longer offered, but a ladder migrated from WordPress can
 * still carry one — and a select whose value is not among its options renders
 * blank, which would make opening the row silently change what it means. So a
 * row already set to it keeps it, and no other row can pick it up.
 */
const optionsFor = (type: TierType | undefined) =>
	type === "FIXED_AMOUNT"
		? [...TYPE_OPTIONS, { value: "FIXED_AMOUNT", label: TIER_TYPE_LABELS.FIXED_AMOUNT }]
		: TYPE_OPTIONS

/**
 * One role's ladder.
 *
 * Its own `useFieldArray`, so adding a rung to the dealer ladder cannot
 * renumber the retail one — the three are edited independently and only meet
 * again when the form is flattened for the API.
 */
const RoleLadder = ({ role, base }: { role: TierRole; base: number | null }) => {
	const t = useTranslations("admin")
	// Its own, rather than threaded from the parent — it is a component, and
	// the query behind this is shared.
	const formatMoney = useMoney()

	const { control, getValues } = useFormContext()
	const name = `tiers.${role}`
	const { fields, append, remove, replace } = useFieldArray({ control, name })

	/**
	 * Live, so the preview column updates as the amount is typed. `useWatch`
	 * rather than `watch()` — the latter subscribes the component that owns
	 * `useForm`, several levels up, and this one would never repaint (§17).
	 */
	const rows = (useWatch({ control, name }) ?? []) as TierRow[]

	const emptyRow = (minQuantity: number): TierRow => ({
		minQuantity,
		// Fixed price is what every ladder in the catalogue uses (§4.2), so it is
		// the one an admin is least surprised to find already selected.
		type: "FIXED_PRICE",
		amount: "",
	})

	/** 100 → 250 → 500 …, so clicking Add follows the ladder the shop uses. */
	const nextQuantity = () => {
		const current = (getValues(name) ?? []) as TierRow[]
		const highest = current.reduce((max, row) => Math.max(max, row.minQuantity ?? 0), 0)
		if (!highest) return STANDARD_LADDER[0]
		return STANDARD_LADDER.find((rung) => rung > highest) ?? highest + 1000
	}

	const addStandardLadder = () => {
		const current = (getValues(name) ?? []) as TierRow[]
		const have = new Set(current.map((row) => row.minQuantity))
		replace(
			[...current, ...STANDARD_LADDER.filter((rung) => !have.has(rung)).map(emptyRow)].sort(
				(a, b) => (a.minQuantity ?? 0) - (b.minQuantity ?? 0)
			)
		)
	}

	/**
	 * Runs on blur, never on keystroke: replace() remounts every row, and
	 * re-sorting mid-typing would pull the field out from under the cursor.
	 */
	const sortRows = () => {
		const current = (getValues(name) ?? []) as TierRow[]
		const sorted = [...current].sort((a, b) => (a.minQuantity ?? 0) - (b.minQuantity ?? 0))
		if (sorted.some((row, index) => row !== current[index])) replace(sorted)
	}

	return (
		<div className="space-y-3">
			<div className="flex justify-end gap-2">
				<Button type="button" variant="outline" size="sm" onClick={addStandardLadder}>
					<Wand2 />{t("standardLadder")}</Button>
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={() => append(emptyRow(nextQuantity()))}
				>
					<Plus />{t("addRow")}</Button>
			</div>

			{!fields.length ? (
				<p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-xs">No quantity discounts for this group. Every order pays the normal price.</p>
			) : (
				<div className="overflow-x-auto">
					<table className="w-full min-w-2xl text-sm">
						<thead>
							<tr className="text-muted-foreground text-left text-xs uppercase">
								<th className="w-44 pb-2 font-medium">{t("discountType")}</th>
								<th className="w-36 pb-2 font-medium">{t("amount")}</th>
								<th className="w-40 pb-2 font-medium">{t("minimumQuantity")}</th>
								<th className="pb-2 font-medium">{t("perUnit")}<span className="block text-[10px] normal-case">what the customer pays</span>
								</th>
								<th className="w-12 pb-2" />
							</tr>
						</thead>
						<tbody>
							{fields.map((field, index) => {
								const row = rows[index]
								const amount = row?.amount?.trim()
								const unit = amount
									? tierUnitPrice(base, row.type, Number(amount))
									: null

								const suffix = TIER_TYPES.find((t) => t.value === row?.type)?.suffix ?? ""

								return (
									<tr key={field.id}>
										<td className="py-1 pr-3 align-top">
											<ProSelect name={`${name}.${index}.type`} options={optionsFor(row?.type)} />
										</td>
										<td className="py-1 pr-3 align-top">
											<ProInput
												name={`${name}.${index}.amount`}
												placeholder={row?.type === "PERCENTAGE" ? "0" : "0.00"}
											/>
										</td>
										<td className="py-1 pr-3 align-top">
											<ProInput
												name={`${name}.${index}.minQuantity`}
												type="number"
												onBlurExtra={sortRows}
											/>
										</td>

										{/*
										 * The whole reason a discount-type column is safe to
										 * offer. "20" means three different prices depending on
										 * the type beside it, and the one number that matters —
										 * what the customer is actually charged — was otherwise
										 * only discoverable by placing an order.
										 */}
										<td className="text-muted-foreground py-1 pr-3 align-top text-xs">
											<div className="flex h-9 items-center gap-1.5">
												{unit !== null ? (
													<>
														<span className="text-foreground font-medium tabular-nums">
															{formatMoney(unit)}
														</span>
														<span className="text-[10px]">{suffix}</span>
													</>
												) : amount ? (
													<span className="text-[10px]">{t("setAPriceAboveToSee")}</span>
												) : (
													<span>—</span>
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
												onClick={() => remove(index)}
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

/**
 * "Buy more, save more" — one ladder per audience, as WholesaleX lays it out
 * (§4.2).
 *
 * Three groups rather than one shared table, because the real data has them
 * genuinely differing: the Reseller ladder sits 25–35 % below the retail one at
 * every quantity, and the two do not always have the same number of rungs.
 *
 * Each rung is WholesaleX's own triple — from what quantity, how to read the
 * amount, and the amount — so a ladder migrated from the live shop round-trips
 * through this form unchanged.
 */
export const QuantityPricing = () => {
	const t = useTranslations("admin")
	const { control } = useFormContext()
	const [role, setRole] = useState<TierRole>("GUEST")

	/**
	 * What each ladder discounts from, watched so the preview follows the price
	 * fields as they are typed.
	 *
	 * The sale price wins where there is one, because that is what the resolver
	 * discounts from. B2C has no field of its own on this form — it is seeded
	 * from the regular price on save — so it previews against the same number.
	 */
	const prices = useWatch({ control, name: "prices" }) as
		| { GUEST: { basePrice: string; salePrice: string }; RESELLER: { basePrice: string; salePrice: string } }
		| undefined

	const regular = prices?.GUEST?.salePrice?.trim() || prices?.GUEST?.basePrice?.trim() || ""
	const dealer = prices?.RESELLER?.salePrice?.trim() || prices?.RESELLER?.basePrice?.trim() || ""

	const baseFor = (key: TierRole): number | null => {
		const value = key === "RESELLER" ? dealer || regular : regular
		return value ? Number(value) : null
	}

	const active = TIER_ROLES.find((r) => r.key === role) ?? TIER_ROLES[0]

	/** Rows already entered, so a group with a ladder is visible from its tab. */
	const counts = useWatch({ control, name: "tiers" }) as
		| Record<TierRole, unknown[]>
		| undefined

	return (
		<div className="space-y-3">
			<div>
				<h3 className="text-sm font-medium">{t("quantityDiscounts")}</h3>
				<p className="text-muted-foreground mt-1 max-w-prose text-xs">
					The price per unit once the customer orders that many. Each row applies from
					its quantity upwards, and the last row covers everything above it. Below the
					first row, the normal price applies.
				</p>
			</div>

			<Tabs value={role} onValueChange={(value) => setRole(value as TierRole)}>
				<TabsList>
					{TIER_ROLES.map((item) => {
						const count = counts?.[item.key]?.length ?? 0
						return (
							<TabsTrigger key={item.key} value={item.key}>
								{item.label}
								{/*
								 * A count rather than a dot: which group has rungs, and how
								 * many, is the thing you come to this tab strip to find out.
								 *
								 * A filled pill rather than bare text, because the active
								 * tab's own label is now the accent colour and a loose
								 * number beside it would read as part of the name.
								 */}
								{!!count && (
									<span className="bg-primary/12 text-primary inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums">
										{count}
									</span>
								)}
							</TabsTrigger>
						)
					})}
				</TabsList>
			</Tabs>

			<p className="text-muted-foreground text-xs">{active.hint}</p>

			{/*
			 * Every ladder is mounted, only the active one is shown.
			 *
			 * Tabs unmount what they are not showing, and an unmounted field array
			 * takes its rows with it — the exact trap that made a required field on
			 * a hidden tab impossible to see (§29). Here it would be worse: the rows
			 * would be gone from the payload entirely.
			 */}
			{TIER_ROLES.map((item) => (
				<div key={item.key} className={cn(item.key !== role && "hidden")}>
					<RoleLadder role={item.key} base={baseFor(item.key)} />
				</div>
			))}
		</div>
	)
}

export default QuantityPricing
