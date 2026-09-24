"use client"

import { useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { useFieldArray, useFormContext, useWatch } from "react-hook-form"
import { GripVertical, Plus, Trash2 } from "lucide-react"
import ProCombobox, { type ProComboboxGroup } from "@/components/form/ProCombobox"
import { Button } from "@/components/ui/button"
import { useAdminCategoriesQuery } from "@/redux/api/categoryApi"
import { useAdminProductsQuery } from "@/redux/api/productApi"
import { pickTranslation } from "@/lib/pickTranslation"
import { cn } from "@/lib/utils"

/**
 * The configurator (§4.6).
 *
 * Not an upsell — this is how a bespoke product is ordered. Each option is a
 * real product with its own SKU, MOQ and tier ladders, so one configured item
 * becomes several order lines, each priced and MOQ-checked independently.
 *
 * One field per row: which product. The group heading, the sort number and the
 * ticked-by-default box were asked for on every option and answered on almost
 * none, so a row that is really one decision took four. Order is the order of
 * the rows — drag them — and that is the order the product page shows.
 *
 * Values already stored for the three retired fields are left alone: the form
 * still round-trips them, they simply have no input here any more.
 */
export const OptionsTab = ({ currentProductId }: { currentProductId?: string }) => {
	const t = useTranslations("admin")
	const { control, register } = useFormContext()
	const { fields, append, remove, move } = useFieldArray({ control, name: "options" })
	const rows = useWatch({ control, name: "options" }) as
		| { optionProductId?: string; followsMainQuantity?: boolean }[]
		| undefined

	/** The row being dragged, and the one it is currently over. */
	const [dragging, setDragging] = useState<number | null>(null)
	const [over, setOver] = useState<number | null>(null)

	const endDrag = () => {
		setDragging(null)
		setOver(null)
	}

	// Only products flagged as options in the dashboard, and never this product
	// itself — attaching a product to itself would recurse forever.
	const { data: result } = useAdminProductsQuery({ kind: "OPTION", limit: 200 })
	const optionProducts = (result?.data ?? []).filter((p) => p.id !== currentProductId)

	/*
	 * The categories the options are filed under, as chips in the picker.
	 *
	 * Taken from the options themselves rather than from `isOptionCategory`,
	 * so a chip never leads to an empty list and an option filed somewhere
	 * unexpected still has a chip that finds it.
	 */
	const { data: categories = [] } = useAdminCategoriesQuery()
	const groups = useMemo<ProComboboxGroup[]>(() => {
		const used = new Set(optionProducts.flatMap((p) => p.categoryIds))
		return categories
			.filter((category) => used.has(category.id))
			.map((category) => ({
				value: category.id,
				label: pickTranslation(category.translations)?.name ?? category.id,
			}))
			.sort((a, b) => a.label.localeCompare(b.label, "de"))
	}, [categories, optionProducts])

	/*
	 * The chip that is on when the picker opens: the option category that
	 * belongs to this product's own category. Every option category here sits
	 * under the main category it serves ("Edelstahl Eiswürfel › … Optionen"),
	 * so an ice-cube product opens on the ice-cube options and nobody has to
	 * press a chip first. More than one match, or none, opens on all of them.
	 */
	const productCategoryIds = useWatch({ control, name: "categoryIds" }) as string[] | undefined
	const defaultGroup = useMemo(() => {
		const own = new Set(productCategoryIds ?? [])
		const matches = categories.filter(
			(category) =>
				groups.some((g) => g.value === category.id) &&
				(own.has(category.id) || (category.parentId && own.has(category.parentId)))
		)
		return matches.length === 1 ? matches[0].id : undefined
	}, [categories, groups, productCategoryIds])

	const pickerOptions = optionProducts.map((product) => ({
		value: product.id,
		label: product.name,
		hint: product.variants[0]?.sku ?? undefined,
		keywords: [product.variants[0]?.sku ?? ""],
		groups: product.categoryIds,
	}))

	const takenIds = new Set((rows ?? []).map((r) => r?.optionProductId).filter(Boolean))

	const addRow = () =>
		append({
			optionProductId: "",
			groupLabel: "",
			// Kept in the payload so nothing breaks, but the submit handler
			// renumbers from the row order — dragging is what decides this now.
			sortOrder: fields.length,
			preselected: false,
			followsMainQuantity: false,
			unitsPerOption: 1,
			discountPercent: null,
		})

	return (
		<div className="space-y-4">
			<p className="text-muted-foreground max-w-prose text-xs">
				{t("optionsStart")}
				<strong>unselected</strong> for the customer, and each one begins at its own
				minimum order quantity — not this product&apos;s, and not 1. Drag a row by
				its handle to reorder; the product page follows this order.
			</p>

			{optionProducts.length === 0 && (
				<p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-xs">
					{t.rich("noOptionProductsYet", { b: (chunks) => <strong>{chunks}</strong> })}
				</p>
			)}

			{optionProducts.length > 0 && !fields.length && (
				<p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-xs">
					No options on this product. It will be sold on its own.
				</p>
			)}

			{/* Two across: eleven options in one column is a lot of scrolling for
			    what is one short line of information each. */}
			<div className="grid gap-3 sm:grid-cols-2">
				{fields.map((field, index) => {
					const chosenId = rows?.[index]?.optionProductId
					const isDragging = dragging === index
					const isTarget = over === index && dragging !== null && dragging !== index

					return (
						<div
							key={field.id}
							onDragOver={(event) => {
								if (dragging === null || dragging === index) return
								// Without this the drop is refused and nothing moves.
								event.preventDefault()
								setOver(index)
							}}
							onDragLeave={() => setOver((current) => (current === index ? null : current))}
							onDrop={(event) => {
								if (dragging === null || dragging === index) return
								event.preventDefault()
								move(dragging, index)
								endDrag()
							}}
							className={cn(
								"flex flex-wrap items-center gap-2 rounded-lg border p-3 transition-all",
								// The one being carried fades and lifts, so it reads as
								// picked up rather than merely selected.
								isDragging && "border-primary scale-[0.98] opacity-40",
								// The one it would land on is outlined. Without this the
								// only feedback was the cursor, and where a row was about
								// to go was anybody's guess.
								isTarget && "border-primary ring-primary/40 ring-2"
							)}
						>
							{/*
							 * The handle is what is draggable, not the row: a row that
							 * dragged from anywhere would fight the combobox inside it, and
							 * selecting text in a field would start a drag.
							 */}
							<button
								type="button"
								draggable
								onDragStart={() => setDragging(index)}
								onDragEnd={endDrag}
								aria-label={t("reorderNumbered", { index: index + 1 })}
								className="text-muted-foreground/60 hover:text-foreground shrink-0 cursor-grab active:cursor-grabbing"
							>
								<GripVertical className="size-4" />
							</button>

							{/* Its place in the order, in the order's own terms. The list is
							    two columns now, so "second" is not something the eye can
							    read off the position alone. */}
							<span className="text-muted-foreground w-5 shrink-0 text-xs tabular-nums">
								{index + 1}
							</span>

							<ProCombobox
								name={`options.${index}.optionProductId`}
								className="min-w-0 flex-1"
								options={pickerOptions.map((option) => ({
									...option,
									disabled: takenIds.has(option.value) && option.value !== chosenId,
								}))}
								groups={groups}
								defaultGroup={defaultGroup}
								/*
								 * Wider and taller than the row's own box: the row is
								 * half the tab, and the names are long and alike, so
								 * a list the width of the trigger cut every one of
								 * them to "Paperbag fü…".
								 */
								contentClassName="w-[min(36rem,calc(100vw-2rem))] min-w-(--radix-popover-trigger-width)"
								listClassName="max-h-[min(24rem,50vh)]"
							/>

							<Button
								type="button"
								variant="ghost"
								size="icon"
								className="text-muted-foreground hover:text-destructive shrink-0"
								aria-label={t("removeNumbered", { thing: t("optionWord"), index: index + 1 })}
								onClick={() => remove(index)}
							>
								<Trash2 />
							</Button>

							{/*
							 * Whether the customer chooses this option's quantity or it
							 * simply takes the product's. The client asked for it on
							 * 22 September: an engraving that goes on every cutter was
							 * being ordered in some other number, and those enquiries
							 * could not be quoted. Under the picker, indented to line up
							 * with it, so it reads as a setting of this row.
							 */}
							<label className="flex basis-full cursor-pointer items-start gap-2 pl-11 text-xs">
								<input
									type="checkbox"
									{...register(`options.${index}.followsMainQuantity`)}
									className="mt-0.5 shrink-0"
								/>
								<span>
									<span className="font-medium">{t("optionFollowsMain")}</span>
									<span className="text-muted-foreground block">{t("optionFollowsMainHelp")}</span>
								</span>
							</label>

							{/*
							 * How many of the product one of this option covers.
							 *
							 * The client, 23 September: a single pack is one per ice cube,
							 * but a set box holds four — "they want 100 sets. This is 400
							 * ice cubes and 100 boxes." Shown only once the option follows
							 * the quantity, because that is the only time it is read.
							 */}
							{rows?.[index]?.followsMainQuantity && (
								<label className="flex basis-full items-center gap-2 pl-11 text-xs">
									<span className="text-muted-foreground">{t("optionUnitsPer")}</span>
									<input
										type="number"
										min={1}
										{...register(`options.${index}.unitsPerOption`, { valueAsNumber: true })}
										className="border-input focus-visible:border-ring w-20 rounded-md border bg-transparent px-2 py-1 text-sm outline-none"
									/>
									<span className="text-muted-foreground">{t("optionUnitsPerHelp")}</span>
								</label>
							)}
						</div>
					)
				})}
			</div>

			{/*
			 * Under the list, not above it.
			 *
			 * A new row appears at the bottom, so a button at the top sent you back
			 * up the page after every single one — and adding options is something
			 * you do several times in a row.
			 */}
			<Button
				type="button"
				variant="outline"
				size="sm"
				disabled={optionProducts.length === 0 || takenIds.size >= optionProducts.length}
				onClick={addRow}
			>
				<Plus />
				{t("addOption")}
			</Button>
		</div>
	)
}

export default OptionsTab
