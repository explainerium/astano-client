"use client"

import { useTranslations } from "next-intl"
import { useEffect, useRef } from "react"
import { useFieldArray, useFormContext, useWatch } from "react-hook-form"
import { List, Plus, Trash2, Type } from "lucide-react"
import ProCheckbox from "@/components/form/ProCheckbox"
import ProInput from "@/components/form/ProInput"
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

interface RowValues {
	attributeId?: string
	mode?: "list" | "text"
}

/**
 * One attribute on the product: its values from the list, or text typed for
 * this product alone.
 *
 * The client, 6 October: "Abmessungen" — 600 products, nearly every one its
 * own size. Each size saved as a list value would sit in every other product's
 * dropdown, unused. Typed here, it stays on this product and a mistake is
 * corrected in the box. Which way an attribute starts is set on the attribute
 * ("Start products with free text"); either way each product can switch.
 */
const AttributeRow = ({
	index,
	attributes,
	takenIds,
	onRemove,
	createAttribute,
	createValue,
}: {
	index: number
	attributes: AdminAttribute[]
	takenIds: Set<string | undefined>
	onRemove: () => void
	createAttribute: (name: string) => Promise<string | null>
	createValue: (attributeId: string) => (label: string) => Promise<string | null>
}) => {
	const t = useTranslations("admin")
	const { control, setValue } = useFormContext()
	const row = useWatch({ control, name: `attributes.${index}` }) as RowValues | undefined

	const chosenId = row?.attributeId
	const chosen = attributes.find((a) => a.id === chosenId)
	const mode = row?.mode ?? "list"

	/*
	 * A newly chosen attribute starts the way it is set to start. Only on a
	 * change of choice — never on the first render, which is a saved product
	 * loading with its own mode — and a change of attribute drops the old
	 * attribute's values, which mean nothing on the new one.
	 */
	const previousId = useRef(chosenId)
	useEffect(() => {
		if (previousId.current === chosenId) return
		previousId.current = chosenId
		if (!chosen) return

		setValue(`attributes.${index}.mode`, chosen.freeText ? "text" : "list")
		setValue(`attributes.${index}.attributeValueIds`, [])
		setValue(`attributes.${index}.isVariation`, false)
	}, [chosen, chosenId, index, setValue])

	const switchTo = (next: "list" | "text") => {
		setValue(`attributes.${index}.mode`, next, { shouldDirty: true })
		// Typed text cannot build variants: there is no shared value to match on.
		if (next === "text") setValue(`attributes.${index}.isVariation`, false, { shouldDirty: true })
	}

	return (
		<div className="space-y-4 rounded-lg border p-4">
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
					onClick={onRemove}
				>
					<Trash2 />
				</Button>
			</div>

			{chosen && (
				<>
					<div className="flex flex-wrap items-center gap-2">
						<Button
							type="button"
							size="sm"
							variant={mode === "list" ? "default" : "outline"}
							aria-pressed={mode === "list"}
							onClick={() => switchTo("list")}
						>
							<List />
							{t("attributeFromList")}
						</Button>
						<Button
							type="button"
							size="sm"
							variant={mode === "text" ? "default" : "outline"}
							aria-pressed={mode === "text"}
							onClick={() => switchTo("text")}
						>
							<Type />
							{t("attributeFreeText")}
						</Button>
						<p className="text-muted-foreground text-xs">
							{mode === "text" ? t("attributeFreeTextHint") : t("attributeFromListHint")}
						</p>
					</div>

					{mode === "list" ? (
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
					) : (
						<div className="grid gap-3 sm:grid-cols-2">
							<ProInput
								name={`attributes.${index}.textDe`}
								label={t("valueGerman")}
								placeholder="z. B. 120 x 80 x 15 mm"
							/>
							<ProInput
								name={`attributes.${index}.textEn`}
								label={t("valueEnglish")}
								description={t("valueEnglishFallback")}
							/>
						</div>
					)}

					<div className="grid gap-3 sm:grid-cols-2">
						<ProCheckbox
							name={`attributes.${index}.isVisible`}
							label={t("visibleOnTheProductPage")}
						/>
						{mode === "list" && (
							<ProCheckbox
								name={`attributes.${index}.isVariation`}
								label={t("usedForVariations")}
								description={t("eachValueBecomesASeparateVersion")}
							/>
						)}
					</div>
				</>
			)}
		</div>
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
	const rows = useWatch({ control, name: "attributes" }) as RowValues[] | undefined

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
	 * starts as the same words and can be corrected under Attributes. Text for
	 * this product alone is the row's "Free text" switch.
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
							mode: "list",
							attributeValueIds: [],
							textDe: "",
							textEn: "",
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

			{fields.map((field, index) => (
				<AttributeRow
					key={field.id}
					index={index}
					attributes={attributes}
					takenIds={takenIds}
					onRemove={() => remove(index)}
					createAttribute={createAttribute}
					createValue={createValue}
				/>
			))}
		</div>
	)
}

export default AttributesTab
