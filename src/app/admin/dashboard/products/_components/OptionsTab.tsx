"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useFieldArray, useFormContext, useWatch } from "react-hook-form"
import { GripVertical, Plus, Trash2 } from "lucide-react"
import ProCombobox from "@/components/form/ProCombobox"
import { Button } from "@/components/ui/button"
import { useAdminProductsQuery } from "@/redux/api/productApi"
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
	const { control } = useFormContext()
	const { fields, append, remove, move } = useFieldArray({ control, name: "options" })
	const rows = useWatch({ control, name: "options" }) as
		| { optionProductId?: string }[]
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

	const takenIds = new Set((rows ?? []).map((r) => r?.optionProductId).filter(Boolean))

	const addRow = () =>
		append({
			optionProductId: "",
			groupLabel: "",
			// Kept in the payload so nothing breaks, but the submit handler
			// renumbers from the row order — dragging is what decides this now.
			sortOrder: fields.length,
			preselected: false,
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
								"flex items-center gap-2 rounded-lg border p-3 transition-all",
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
								options={optionProducts.map((product) => ({
									value: product.id,
									label: product.name,
									keywords: [product.variants[0]?.sku ?? ""],
									disabled: takenIds.has(product.id) && product.id !== chosenId,
								}))}
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
