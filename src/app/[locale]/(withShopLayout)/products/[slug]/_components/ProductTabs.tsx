"use client"

import { useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { usePublicSettingsQuery } from "@/redux/api/settingApi"
import { cn } from "@/lib/utils"
import { richTextClass } from "@/lib/richText"
import { convertDimension, dimensionUnitOf, formatWeight, weightUnitOf } from "@/lib/units"
import type { PublicProductDetail, PublicVariant } from "@/types/storefront"

/**
 * The tab strip below the fold — description, then the specification table.
 *
 * WooCommerce's own layout, and the one the client's shop already has, so a
 * customer arriving from the old site finds the copy where they left it. Only
 * tabs with something in them are rendered: an empty "Additional information"
 * heading is worse than no heading, because it promises a specification and
 * then shows a blank.
 *
 * Reviews are deliberately absent. astano has no review system, and a tab that
 * always says "no reviews yet" advertises an absence.
 */
export const ProductTabs = ({
	product,
	variant,
}: {
	product: PublicProductDetail
	variant: PublicVariant | null
}) => {
	const t = useTranslations("shop")
	const locale = useLocale()
	const { data: shopSettings } = usePublicSettingsQuery()

	// Stored in kg and cm; shown in whatever the shop configured.
	const weightUnit = weightUnitOf(shopSettings)
	const dimensionUnit = dimensionUnitOf(shopSettings)

	/**
	 * Weight, the three dimensions, and every attribute the variant carries.
	 *
	 * Built before the tabs so an empty specification can hide its own tab
	 * rather than render an empty table.
	 */
	const spec: { label: string; value: string }[] = []

	if (variant?.sku) spec.push({ label: t("sku"), value: variant.sku })

	const weight = formatWeight(variant?.weightKg, weightUnit, locale)
	if (weight) spec.push({ label: t("weight"), value: weight })

	const dimensions = [variant?.lengthCm, variant?.widthCm, variant?.heightCm]
	if (dimensions.some(Boolean)) {
		// "12 × 8 × 3 cm", with a dash where a dimension was left unset rather
		// than a zero, which would read as a measurement.
		spec.push({
			label: t("dimensions"),
			value: `${dimensions.map((d) => convertDimension(d, dimensionUnit) ?? "—").join(" × ")} ${dimensionUnit}`,
		})
	}

	/*
	 * The product's own attributes, then the variant's.
	 *
	 * They answer different questions and both belong here. The product's are
	 * what the shop published about the article — "Material: Edelstahl" — and
	 * the variant's are which one of a choice this particular variant is. The
	 * product's went unprinted entirely until now, which is what the client
	 * meant by attributes not showing on the product page: the admin has a
	 * "visible on the product page" tick, and nothing was reading it.
	 */
	for (const attribute of product.attributes ?? []) {
		if (!attribute.values.length) continue
		spec.push({ label: attribute.name, value: attribute.values.join(", ") })
	}

	for (const attribute of variant?.attributes ?? []) {
		// Skip what the product already stated, or a variant of a product with
		// one material prints "Material" twice with the same word after it.
		if (spec.some((row) => row.label === attribute.name)) continue
		spec.push({ label: attribute.name, value: attribute.label })
	}

	if (product.moq > 1) {
		spec.push({ label: t("minimumOrderLabel"), value: String(product.moq) })
	}

	/*
	 * The two built-in tabs, then whatever the shop added, in its own order.
	 *
	 * The API has already dropped any tab with no heading or no content in this
	 * locale, so anything arriving here is meant to be shown.
	 */
	const tabs = [
		product.description && { id: "description", label: t("description") },
		spec.length && { id: "specification", label: t("additionalInformation") },
		...(product.tabs ?? []).map((tab) => ({ id: `custom-${tab.id}`, label: tab.title })),
	].filter(Boolean) as { id: string; label: string }[]

	const [active, setActive] = useState(tabs[0]?.id ?? "description")

	if (!tabs.length) return null

	return (
		<section className="mt-16 border-t pt-10">
			{/*
			 * A real tablist, not styled links. Arrow keys and screen readers get
			 * the behaviour for free, and there is exactly one tab stop for the
			 * whole strip rather than one per tab.
			 */}
			<div role="tablist" aria-label={t("productInformation")} className="flex flex-wrap gap-1 border-b">
				{tabs.map((tab) => {
					const selected = tab.id === active
					return (
						<button
							key={tab.id}
							role="tab"
							id={`tab-${tab.id}`}
							aria-selected={selected}
							aria-controls={`panel-${tab.id}`}
							tabIndex={selected ? 0 : -1}
							onClick={() => setActive(tab.id)}
							onKeyDown={(event) => {
								if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return
								event.preventDefault()
								const index = tabs.findIndex((x) => x.id === active)
								const next = event.key === "ArrowRight" ? index + 1 : index - 1
								setActive(tabs[(next + tabs.length) % tabs.length].id)
							}}
							className={cn(
								"font-heading -mb-px border-b-2 px-5 py-3 text-sm font-semibold tracking-wide transition-colors",
								selected
									? "border-primary text-foreground"
									: "text-muted-foreground hover:text-foreground border-transparent"
							)}
						>
							{tab.label}
						</button>
					)
				})}
			</div>

			{product.description && (
				<div
					role="tabpanel"
					id="panel-description"
					aria-labelledby="tab-description"
					hidden={active !== "description"}
					className="pt-8"
				>
					<div
						className={richTextClass}
						// Product copy is written by staff in the admin editor, not by
						// shoppers, and is stored as the TipTap HTML they authored.
						dangerouslySetInnerHTML={{ __html: product.description }}
					/>
				</div>
			)}

			{!!spec.length && (
				<div
					role="tabpanel"
					id="panel-specification"
					aria-labelledby="tab-specification"
					hidden={active !== "specification"}
					className="pt-8"
				>
					{/* Two columns, striped — WooCommerce's shop_attributes table, which
					    is what the client's customers already read. */}
					<table className="w-full max-w-3xl border-collapse text-sm">
						<tbody>
							{spec.map((row, index) => (
								<tr key={`${row.label}-${index}`} className="odd:bg-muted/40 border-b">
									<th
										scope="row"
										className="text-muted-foreground w-48 px-4 py-3 text-left font-medium"
									>
										{row.label}
									</th>
									<td className="px-4 py-3">{row.value}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}

			{/*
			 * The shop's own tabs.
			 *
			 * Same styling as the description, from the same shared class — a size
			 * chart written as a table in the admin editor has to come out as a
			 * table here, or the editor was lying about what it was producing.
			 */}
			{(product.tabs ?? []).map((tab) => (
				<div
					key={tab.id}
					role="tabpanel"
					id={`panel-custom-${tab.id}`}
					aria-labelledby={`tab-custom-${tab.id}`}
					hidden={active !== `custom-${tab.id}`}
					className="pt-8"
				>
					<div
						className={richTextClass}
						// Written by staff in the admin editor and sanitised on the way
						// into the database — see domain/html/sanitizeRichText.
						dangerouslySetInnerHTML={{ __html: tab.content ?? "" }}
					/>
				</div>
			))}
		</section>
	)
}

export default ProductTabs
