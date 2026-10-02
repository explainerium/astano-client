"use client"

import { useTranslations } from "next-intl"
import { useFieldArray, useFormContext, useWatch } from "react-hook-form"
import { Plus, Trash2 } from "lucide-react"
import ProCheckbox from "@/components/form/ProCheckbox"
import { pickTranslation } from "@/lib/pickTranslation"
import ProCombobox from "@/components/form/ProCombobox"
import { Button } from "@/components/ui/button"
import {
	useAddAttributeByNameMutation,
	useAddAttributeValueMutation,
	useAdminAttributesQuery,
} from "@/redux/api/attributeApi"
import type { AdminAttribute } from "@/types/attribute"

const nameOf = (attribute: AdminAttribute) =>
	pickTranslation(attribute.translations)?.name ?? attribute.code

const labelOf = (attribute: AdminAttribute, valueId: string) => {
	const value = attribute.values.find((v) => v.id === valueId)
	return (
		pickTranslation(value?.translations)?.label ?? value?.code ?? valueId
	)
}

/**
 * The product's Attributes tab, as WooCommerce arranges it: pick an attribute,
 * choose its values, then decide per product whether it is visible and whether
 * it builds variants.
 *
 * Those two flags live here rather than on the attribute itself — "Size" can
 * split one product into versions and be a plain specification on another.
 */
export const AttributesTab = () => {
	const t = useTranslations("admin")
	const { control } = useFormContext()
	const { fields, append, remove } = useFieldArray({ control, name: "attributes" })
	const rows = useWatch({ control, name: "attributes" }) as
		| { attributeId?: string }[]
		| undefined

	const { data: attributes = [] } = useAdminAttributesQuery()
	const [addValue] = useAddAttributeValueMutation()
	const [addAttribute] = useAddAttributeByNameMutation()

	/*
	 * An attribute that does not exist yet, typed by name. Without it a missing
	 * "Wandstärke" meant leaving a half-filled product for the Attributes page
	 * and coming back.
	 */
	const createAttribute = async (name: string) => {
		try {
			return (await addAttribute(name).unwrap()).id
		} catch {
			return null
		}
	}

	/*
	 * A value that is not in the list yet, typed straight in.
	 *
	 * The client, 1 October: "Is it possible to make also a free text for the
	 * product attributes, not only choosing from the list?" It joins the
	 * attribute's list rather than living on this product alone, so the next
	 * product finds it and it can still build variants. The English label
	 * starts as the same words and can be corrected under Attributes.
	 */
	const createValue = (attributeId: string) => async (label: string) => {
		try {
			const value = await addValue({ attributeId, label }).unwrap()
			return value.id
		} catch {
			return null
		}
	}

	// An attribute may only be added once — a second row for the same one would
	// produce contradictory visible/variation flags for the same rows.
	const takenIds = new Set((rows ?? []).map((r) => r?.attributeId).filter(Boolean))

	return (
		<div className="space-y-4">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<p className="text-muted-foreground max-w-prose text-xs">{t("attributesMarked")}<strong>used for variations</strong> split this product
					into separate versions, each with its own SKU and stock. The rest appear
					as specifications on the product page.
				</p>
				<Button
					type="button"
					variant="outline"
					size="sm"
					// Never disabled for want of attributes: a new one can be typed in.
					onClick={() =>
						append({
							attributeId: "",
							attributeValueIds: [],
							isVisible: true,
							isVariation: false,
						})
					}
				>
					<Plus />{t("addAttribute")}</Button>
			</div>

			{attributes.length === 0 && (
				<p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-xs">
					{t("noAttributesExistYet")}
				</p>
			)}

			{attributes.length > 0 && !fields.length && (
				<p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-xs">
					No attributes on this product.
				</p>
			)}

			{fields.map((field, index) => {
				const chosenId = rows?.[index]?.attributeId
				const chosen = attributes.find((a) => a.id === chosenId)

				return (
					<div key={field.id} className="space-y-4 rounded-lg border p-4">
						<div className="flex items-start gap-3">
							<ProCombobox
								name={`attributes.${index}.attributeId`}
								label={t("attribute")}
								className="flex-1"
								searchPlaceholder={t("searchOrTypeNewAttribute")}
								onCreate={createAttribute}
								createLabel={(text) => t("addNewAttribute", { name: text })}
								options={attributes.map((attribute) => ({
									label: nameOf(attribute),
									value: attribute.id,
									// Still selectable if it is this row's own choice.
									disabled: takenIds.has(attribute.id) && attribute.id !== chosenId,
								}))}
							/>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								className="text-muted-foreground hover:text-destructive mt-7"
								aria-label={t("removeNumbered", { thing: t("attributeWord"), index: index + 1 })}
								onClick={() => remove(index)}
							>
								<Trash2 />
							</Button>
						</div>

						{chosen && (
							<>
								<ProCombobox
									name={`attributes.${index}.attributeValueIds`}
									label={t("values")}
									multiple
									placeholder={t("noValuesSelected")}
									searchPlaceholder={t("searchOrTypeNewValue")}
									onCreate={createValue(chosen.id)}
									createLabel={(text) => t("addNewValue", { value: text })}
									options={chosen.values.map((value) => ({
										value: value.id,
										label: labelOf(chosen, value.id),
										keywords: [value.code],
									}))}
								/>

								<div className="grid gap-3 sm:grid-cols-2">
									<ProCheckbox
										name={`attributes.${index}.isVisible`}
										label={t("visibleOnTheProductPage")}
									/>
									<ProCheckbox
										name={`attributes.${index}.isVariation`}
										label={t("usedForVariations")}
										description={t("eachValueBecomesASeparateVersion")}
									/>
								</div>
							</>
						)}
					</div>
				)
			})}
		</div>
	)
}

export default AttributesTab
