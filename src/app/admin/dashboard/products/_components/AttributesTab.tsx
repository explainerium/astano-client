"use client"

import { useFieldArray, useFormContext, useWatch } from "react-hook-form"
import { Plus, Trash2 } from "lucide-react"
import ProCheckbox from "@/components/form/ProCheckbox"
import ProCombobox from "@/components/form/ProCombobox"
import ProSelect from "@/components/form/ProSelect"
import { Button } from "@/components/ui/button"
import { useAdminAttributesQuery } from "@/redux/api/attributeApi"
import type { AdminAttribute } from "@/types/attribute"

const nameOf = (attribute: AdminAttribute) =>
	attribute.translations.find((t) => t.locale === "en")?.name ??
	attribute.translations[0]?.name ??
	attribute.code

const labelOf = (attribute: AdminAttribute, valueId: string) => {
	const value = attribute.values.find((v) => v.id === valueId)
	return (
		value?.translations.find((t) => t.locale === "en")?.label ?? value?.code ?? valueId
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
	const { control } = useFormContext()
	const { fields, append, remove } = useFieldArray({ control, name: "attributes" })
	const rows = useWatch({ control, name: "attributes" }) as
		| { attributeId?: string }[]
		| undefined

	const { data: attributes = [] } = useAdminAttributesQuery()

	// An attribute may only be added once — a second row for the same one would
	// produce contradictory visible/variation flags for the same rows.
	const takenIds = new Set((rows ?? []).map((r) => r?.attributeId).filter(Boolean))

	return (
		<div className="space-y-4">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<p className="text-muted-foreground max-w-prose text-xs">
					Attributes marked <strong>used for variations</strong> split this product
					into separate versions, each with its own SKU and stock. The rest appear
					as specifications on the product page.
				</p>
				<Button
					type="button"
					variant="outline"
					size="sm"
					disabled={attributes.length === 0 || takenIds.size >= attributes.length}
					onClick={() =>
						append({
							attributeId: "",
							attributeValueIds: [],
							isVisible: true,
							isVariation: false,
						})
					}
				>
					<Plus />
					Add attribute
				</Button>
			</div>

			{attributes.length === 0 && (
				<p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-xs">
					No attributes exist yet. Create Size or Material first, then attach them
					here.
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
							<ProSelect
								name={`attributes.${index}.attributeId`}
								label="Attribute"
								className="flex-1"
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
								aria-label={`Remove attribute ${index + 1}`}
								onClick={() => remove(index)}
							>
								<Trash2 />
							</Button>
						</div>

						{chosen && (
							<>
								<ProCombobox
									name={`attributes.${index}.attributeValueIds`}
									label="Values"
									multiple
									placeholder="No values selected"
									options={chosen.values.map((value) => ({
										value: value.id,
										label: labelOf(chosen, value.id),
										keywords: [value.code],
									}))}
								/>

								<div className="grid gap-3 sm:grid-cols-2">
									<ProCheckbox
										name={`attributes.${index}.isVisible`}
										label="Visible on the product page"
									/>
									<ProCheckbox
										name={`attributes.${index}.isVariation`}
										label="Used for variations"
										description="Each value becomes a separate version with its own SKU."
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
