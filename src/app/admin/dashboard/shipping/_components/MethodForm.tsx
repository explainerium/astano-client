"use client"

import { useTranslations } from "next-intl"
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useFieldArray, useFormContext, useWatch } from "react-hook-form"
import { Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { z } from "zod"
import EditorHeader from "@/components/dashboard/shell/EditorHeader"
import ProCheckbox from "@/components/form/ProCheckbox"
import ProForm from "@/components/form/ProForm"
import ProInput from "@/components/form/ProInput"
import ProSelect from "@/components/form/ProSelect"
import ProSubmit from "@/components/form/ProSubmit"
import ProTextarea from "@/components/form/ProTextarea"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
	useCreateShippingMethodMutation,
	useUpdateShippingMethodMutation,
} from "@/redux/api/shippingApi"
import type {
	ShippingMethod,
	ShippingMethodPayload,
	ShippingMethodType,
} from "@/types/shipping"

const EDITOR_LOCALES = [
	{ code: "en", label: "English" },
	{ code: "de", label: "Deutsch" },
] as const

const TYPES = [
	{ label: "Weight bands", value: "WEIGHT_BANDED" },
	{ label: "Flat rate", value: "FLAT_RATE" },
	{ label: "Free shipping", value: "FREE_SHIPPING" },
	{ label: "Order-value bands", value: "PRICE_BANDED" },
]

const BANDED: ShippingMethodType[] = ["WEIGHT_BANDED", "PRICE_BANDED"]

const money = z
	.string()
	.trim()
	.refine((v) => v === "" || /^\d+(\.\d{1,4})?$/.test(v), { message: "Use a number like 8.50" })

const schema = z
	.object({
		code: z
			.string()
			.trim()
			.min(1, "Required")
			.max(60)
			.regex(/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/, "Lowercase letters, digits, - or _"),
		type: z.enum(["WEIGHT_BANDED", "FLAT_RATE", "FREE_SHIPPING", "PRICE_BANDED"]),
		flatCost: money,
		freeAboveSubtotal: money,
		taxable: z.boolean(),
		isActive: z.boolean(),
		sortOrder: z.number({ message: "Enter a number" }).int().min(0),
		en: z.object({
			name: z.string().trim().min(1, "An English name is required"),
			description: z.string().trim().max(500),
		}),
		de: z.object({
			name: z.string().trim(),
			description: z.string().trim().max(500),
		}),
		bands: z.array(
			z.object({
				minValue: money.refine((v) => v !== "", { message: "Required" }),
				/** Empty means open-ended — allowed on the last rung only. */
				maxValue: money,
				cost: money.refine((v) => v !== "", { message: "Required" }),
			})
		),
	})
	.superRefine((values, ctx) => {
		if (values.type === "FLAT_RATE" && !values.flatCost.trim()) {
			ctx.addIssue({ code: "custom", path: ["flatCost"], message: "A flat rate needs a cost." })
		}

		if (!BANDED.includes(values.type)) return

		if (!values.bands.length) {
			ctx.addIssue({
				code: "custom",
				path: ["type"],
				message: "A banded method needs at least one band, or nothing can be quoted.",
			})
			return
		}

		/**
		 * The ladder must be contiguous.
		 *
		 * A gap is the dangerous mistake: a cart landing in it matches no band,
		 * so the customer is offered no shipping at all and checkout simply
		 * stops. Overlaps are less severe — findBand() takes the highest
		 * minimum — but they are still a mistake, and requiring each rung to
		 * begin exactly where the last one ended rules out both at once.
		 */
		const rows = values.bands
			.map((band, index) => ({ band, index }))
			.sort((a, b) => Number(a.band.minValue) - Number(b.band.minValue))

		rows.forEach(({ band, index }, position) => {
			const min = Number(band.minValue)
			const max = band.maxValue.trim() === "" ? null : Number(band.maxValue)

			if (max !== null && max <= min) {
				ctx.addIssue({
					code: "custom",
					path: ["bands", index, "maxValue"],
					message: "Must be above the band's own minimum.",
				})
			}

			// Only the final rung may run to infinity, otherwise everything after
			// it is unreachable.
			if (max === null && position !== rows.length - 1) {
				ctx.addIssue({
					code: "custom",
					path: ["bands", index, "maxValue"],
					message: "Only the last band may be open-ended.",
				})
			}

			if (position === 0) return

			const previous = rows[position - 1].band
			const previousMax = previous.maxValue.trim() === "" ? null : Number(previous.maxValue)

			if (previousMax !== null && previousMax !== min) {
				ctx.addIssue({
					code: "custom",
					path: ["bands", index, "minValue"],
					message:
						previousMax < min
							? `Leaves a gap: nothing covers ${previousMax}–${min}.`
							: `Overlaps the band ending at ${previousMax}.`,
				})
			}
		})
	})

type FormValues = z.infer<typeof schema>

const translationFor = (method: ShippingMethod | undefined, locale: string) =>
	method?.translations.find((t) => t.locale === locale)

/** Trailing zeros from Decimal(12,4) would show as "8.5000" in a field. */
const trim = (value: string | null | undefined) => (value ? String(Number(value)) : "")

const toDefaults = (method?: ShippingMethod): FormValues => ({
	code: method?.code ?? "",
	type: method?.type ?? "WEIGHT_BANDED",
	flatCost: trim(method?.flatCost),
	freeAboveSubtotal: trim(method?.freeAboveSubtotal),
	taxable: method?.taxable ?? true,
	isActive: method?.isActive ?? true,
	sortOrder: method?.sortOrder ?? 0,
	en: {
		name: translationFor(method, "en")?.name ?? "",
		description: translationFor(method, "en")?.description ?? "",
	},
	de: {
		name: translationFor(method, "de")?.name ?? "",
		description: translationFor(method, "de")?.description ?? "",
	},
	bands: (method?.bands ?? []).map((band) => ({
		minValue: trim(band.minValue),
		maxValue: trim(band.maxValue),
		cost: trim(band.cost),
	})),
})

/**
 * Everything that depends on the chosen type.
 *
 * Its own component so it can `useWatch` — `watch()` from useFormContext
 * re-renders whichever component owns useForm, which is ProForm, and its
 * children are stable elements that React would skip.
 */
const TypeFields = () => {
	const { control, getValues } = useFormContext()
	const type = useWatch({ control, name: "type" }) as ShippingMethodType
	const { fields, append, remove } = useFieldArray({ control, name: "bands" })

	const unit = type === "PRICE_BANDED" ? "€" : "kg"

	/** A new rung starts where the last one ended, which is almost always right. */
	const appendBand = () => {
		const rows = (getValues("bands") ?? []) as { maxValue?: string }[]
		const last = rows[rows.length - 1]
		return append({ minValue: last?.maxValue?.trim() ?? "", maxValue: "", cost: "" })
	}

	if (type === "FLAT_RATE") {
		return (
			<ProInput
				name="flatCost"
				label="Cost per order"
				description="Charged once, whatever the cart weighs."
				placeholder="0.00"
				className="sm:max-w-xs"
			/>
		)
	}

	if (type === "FREE_SHIPPING") {
		return (
			<ProInput
				name="freeAboveSubtotal"
				label="Free above order value"
				description="Leave empty to make it always free."
				placeholder="—"
				className="sm:max-w-xs"
			/>
		)
	}

	return (
		<div className="space-y-3">
			<div className="flex flex-wrap items-end justify-between gap-2">
				<div>
					<h3 className="text-sm font-medium">
						{type === "PRICE_BANDED" ? "Order-value bands" : "Weight bands"}
					</h3>
					<p className="text-muted-foreground mt-1 max-w-prose text-xs">
						Each band runs from its start up to — but not including — the next
						one. Leave the last <em>To</em> empty for everything above it. Bands
						must join up: a gap means an order in it is offered no shipping at
						all.
					</p>
				</div>
				<Button type="button" variant="outline" size="sm" onClick={appendBand}>
					<Plus />Add band</Button>
			</div>

			{!fields.length ? (
				<p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-xs">No bands yet. Nothing can be quoted until there is at least one.</p>
			) : (
				<div className="overflow-x-auto">
					<table className="w-full min-w-lg text-sm">
						<thead>
							<tr className="text-muted-foreground text-left text-xs uppercase">
								<th className="w-32 pb-2 font-medium">From ({unit})</th>
								<th className="w-32 pb-2 font-medium">To ({unit})</th>
								<th className="pb-2 font-medium">Cost (€)</th>
								<th className="w-12 pb-2" />
							</tr>
						</thead>
						<tbody>
							{fields.map((field, index) => (
								<tr key={field.id}>
									<td className="py-1 pr-3 align-top">
										<ProInput name={`bands.${index}.minValue`} placeholder="0" />
									</td>
									<td className="py-1 pr-3 align-top">
										<ProInput name={`bands.${index}.maxValue`} placeholder="∞" />
									</td>
									<td className="py-1 pr-3 align-top">
										<ProInput name={`bands.${index}.cost`} placeholder="0.00" />
									</td>
									<td className="py-1 align-top">
										<Button
											type="button"
											variant="ghost"
											size="icon"
											className="text-muted-foreground hover:text-destructive"
											aria-label={`Remove band ${index + 1}`}
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

export const MethodForm = ({
	zoneId,
	zoneName,
	method,
}: {
	zoneId: string
	/** For the heading — a method only means anything as part of its zone. */
	zoneName: string
	method?: ShippingMethod
}) => {
	const t = useTranslations("admin")
	const router = useRouter()
	const [createMethod] = useCreateShippingMethodMutation()
	const [updateMethod] = useUpdateShippingMethodMutation()
	const [activeLocale, setActiveLocale] = useState<string>(EDITOR_LOCALES[0].code)

	const isEdit = !!method
	const zoneHref = `/admin/dashboard/shipping/zones/${zoneId}/edit`

	const onSubmit = async (form: FormValues) => {
		const banded = BANDED.includes(form.type)

		const payload: ShippingMethodPayload = {
			code: form.code.trim(),
			type: form.type,
			// Only the field the chosen type actually uses is sent; the other is
			// cleared so a method switched from flat to banded stops carrying a
			// cost that nothing reads.
			flatCost: form.type === "FLAT_RATE" ? form.flatCost.trim() || null : null,
			freeAboveSubtotal:
				form.type === "FREE_SHIPPING" ? form.freeAboveSubtotal.trim() || null : null,
			taxable: form.taxable,
			isActive: form.isActive,
			sortOrder: form.sortOrder,
			translations: [
				{
					locale: "en",
					name: form.en.name.trim(),
					...(form.en.description.trim() ? { description: form.en.description.trim() } : {}),
				},
				...(form.de.name.trim()
					? [
							{
								locale: "de",
								name: form.de.name.trim(),
								...(form.de.description.trim()
									? { description: form.de.description.trim() }
									: {}),
							},
						]
					: []),
			],
			bands: banded
				? form.bands.map((band) => ({
						minValue: band.minValue.trim(),
						maxValue: band.maxValue.trim() || null,
						cost: band.cost.trim(),
					}))
				: [],
		}

		try {
			if (isEdit) {
				await updateMethod({ id: method.id, data: payload }).unwrap()
				toast.success(t("methodUpdated"))
			} else {
				await createMethod({ ...payload, zoneId }).unwrap()
				toast.success(t("methodAdded"))
			}
			// Back to the zone either way: a method is only meaningful beside the
			// others in its zone, and the gap-free ladder is checked across them.
			router.push(zoneHref)
		} catch (error) {
			const message = (error as { data?: { message?: string } })?.data?.message
			toast.error(message ?? "Could not save the method.")
		}
	}

	return (
		<div className="space-y-6">
			<EditorHeader
				backHref={zoneHref}
				backLabel={zoneName}
				title={isEdit ? (translationFor(method, "en")?.name ?? method.code) : "New method"}
				description={t("whatTheCustomerIsOfferedAt")}
			/>

			<ProForm
					key={method?.id ?? "new"}
					onSubmit={onSubmit}
					resolver={zodResolver(schema)}
					defaultValues={toDefaults(method)}
					className="space-y-6"
				>
					<div className="bg-card space-y-6 rounded-lg border p-5">
						<div className="grid gap-4 sm:grid-cols-3">
							<ProInput name="code" label={t("code")} required />
							<ProSelect name="type" label={t("costIsBasedOn")} options={TYPES} />
							<ProInput name="sortOrder" type="number" label={t("sortOrder")} />
						</div>

					<Tabs value={activeLocale} onValueChange={setActiveLocale}>
						<TabsList>
							{EDITOR_LOCALES.map(({ code, label }) => (
								<TabsTrigger key={code} value={code} className="gap-2">
									{label}
									{isEdit && !translationFor(method, code)?.name && (
										<Badge variant="secondary" className="text-[10px]">
											empty
										</Badge>
									)}
								</TabsTrigger>
							))}
						</TabsList>

						{EDITOR_LOCALES.map(({ code }) => (
							<TabsContent key={code} value={code} className="space-y-4 pt-4">
								<ProInput
									name={`${code}.name`}
									label={t("name")}
									description={t("shownToTheCustomerAtCheckout")}
									required={code === "en"}
								/>
								<ProTextarea
									name={`${code}.description`}
									label={t("description")}
									description={t("optionalLineUnderTheNameDelivery")}
								/>
							</TabsContent>
						))}
					</Tabs>

						<div className="border-t pt-5">
							<TypeFields />
						</div>

						<div className="space-y-4 border-t pt-5">
							<ProCheckbox
								name="taxable"
								label={t("taxTheShippingCharge")}
								description={t("onForTheEuZonesOn")}
							/>
							<ProCheckbox
								name="isActive"
								label={t("active")}
								description="An inactive method is never offered at checkout."
							/>
						</div>
					</div>

					<div className="flex justify-end gap-2">
						<Button asChild type="button" variant="ghost">
							<Link href={zoneHref}>{t("cancel")}</Link>
						</Button>
						<ProSubmit>{isEdit ? "Save changes" : "Add method"}</ProSubmit>
					</div>
				</ProForm>
		</div>
	)
}

export default MethodForm
