"use client"

import { useTranslations } from "next-intl"
import { useFieldArray, useFormContext, useWatch } from "react-hook-form"
import { GripVertical, Plus, Trash2 } from "lucide-react"
import ProCheckbox from "@/components/form/ProCheckbox"
import ProCombobox from "@/components/form/ProCombobox"
import ProInput from "@/components/form/ProInput"
import { Button } from "@/components/ui/button"
import { useAdminProductsQuery } from "@/redux/api/productApi"

/**
 * The configurator (§4.6).
 *
 * Not an upsell — this is how a bespoke product is ordered. Each option is a
 * real product with its own SKU, MOQ and tier ladders, so one configured item
 * becomes several order lines, each priced and MOQ-checked independently.
 *
 * There is no bundle entity to create first: options attach straight to the
 * product, and the optional group label gives page headings without needing one.
 */
export const OptionsTab = ({ currentProductId }: { currentProductId?: string }) => {
	const t = useTranslations("admin")
	const { control } = useFormContext()
	const { fields, append, remove } = useFieldArray({ control, name: "options" })
	const rows = useWatch({ control, name: "options" }) as
		| { optionProductId?: string }[]
		| undefined

	// Only products flagged as options in the dashboard, and never this product
	// itself — attaching a product to itself would recurse forever.
	const { data: result } = useAdminProductsQuery({ kind: "OPTION", limit: 200 })
	const optionProducts = (result?.data ?? []).filter((p) => p.id !== currentProductId)

	const takenIds = new Set((rows ?? []).map((r) => r?.optionProductId).filter(Boolean))

	return (
		<div className="space-y-4">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<p className="text-muted-foreground max-w-prose text-xs">{t("optionsStart")}<strong>unselected</strong> for the customer, and each one
					begins at its own minimum order quantity — not this product&apos;s, and
					not 1.
				</p>
				<Button
					type="button"
					variant="outline"
					size="sm"
					disabled={
						optionProducts.length === 0 || takenIds.size >= optionProducts.length
					}
					onClick={() =>
						append({
							optionProductId: "",
							groupLabel: "",
							sortOrder: fields.length,
							preselected: false,
						})
					}
				>
					<Plus />{t("addOption")}</Button>
			</div>

			{optionProducts.length === 0 && (
				<p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-xs">
					No option products exist yet. Create a product and set its dashboard
					label to <strong>{t("option")}</strong> — engraving, coating, packaging and so
					on — then attach it here.
				</p>
			)}

			{optionProducts.length > 0 && !fields.length && (
				<p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-xs">
					No options on this product. It will be sold on its own.
				</p>
			)}

			{fields.map((field, index) => {
				const chosenId = rows?.[index]?.optionProductId

				return (
					<div key={field.id} className="flex items-start gap-2 rounded-lg border p-4">
						<GripVertical className="text-muted-foreground/50 mt-8 size-4 shrink-0" />

						<div className="grid flex-1 gap-3 sm:grid-cols-2">
							<ProCombobox
								name={`options.${index}.optionProductId`}
								label={t("optionProduct")}
								className="sm:col-span-2"
								options={optionProducts.map((product) => ({
									value: product.id,
									label: product.name,
									keywords: [product.variants[0]?.sku ?? ""],
									disabled: takenIds.has(product.id) && product.id !== chosenId,
								}))}
							/>

							<ProInput
								name={`options.${index}.groupLabel`}
								label={t("groupHeading")}
								description={t("groupsOptionsUnderAHeadingE")}
							/>
							<ProInput
								name={`options.${index}.sortOrder`}
								type="number"
								label={t("order")}
							/>

							<ProCheckbox
								name={`options.${index}.preselected`}
								label={t("tickedByDefault")}
								description={t("theLiveSiteStartsEveryOption")}
								className="sm:col-span-2"
							/>
						</div>

						<Button
							type="button"
							variant="ghost"
							size="icon"
							className="text-muted-foreground hover:text-destructive mt-7"
							aria-label={`Remove option ${index + 1}`}
							onClick={() => remove(index)}
						>
							<Trash2 />
						</Button>
					</div>
				)
			})}
		</div>
	)
}

export default OptionsTab
