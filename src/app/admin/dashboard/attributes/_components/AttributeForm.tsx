"use client"

import { useTranslations } from "next-intl"
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useFieldArray, useFormContext } from "react-hook-form"
import { GripVertical, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { z } from "zod"
import EditorHeader from "@/components/dashboard/shell/EditorHeader"
import ProForm from "@/components/form/ProForm"
import ProInput from "@/components/form/ProInput"
import ProSubmit from "@/components/form/ProSubmit"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useCreateAttributeMutation, useUpdateAttributeMutation } from "@/redux/api/attributeApi"
import type { AdminAttribute, AttributePayload } from "@/types/attribute"

const EDITOR_LOCALES = [
	{ code: "en", label: "English" },
	{ code: "de", label: "Deutsch" },
] as const

const CODE_PATTERN = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/

const codeField = z
	.string()
	.trim()
	.min(1, "Required")
	.max(60)
	.regex(CODE_PATTERN, "Lowercase letters, digits, - or _")

const schema = z.object({
	code: codeField,
	sortOrder: z.number({ message: "Enter a number" }).int().min(0),
	en: z.object({ name: z.string().trim().min(1, "An English name is required") }),
	de: z.object({ name: z.string().trim() }),
	values: z.array(
		z.object({
			id: z.string().optional(),
			code: codeField,
			labelEn: z.string().trim().min(1, "Required"),
			labelDe: z.string().trim(),
		})
	),
})

type FormValues = z.infer<typeof schema>

const translationFor = (rows: { locale: string }[] | undefined, locale: string) =>
	rows?.find((r) => r.locale === locale)

const toDefaults = (attribute?: AdminAttribute): FormValues => ({
	code: attribute?.code ?? "",
	sortOrder: attribute?.sortOrder ?? 0,
	en: { name: (translationFor(attribute?.translations, "en") as { name?: string })?.name ?? "" },
	de: { name: (translationFor(attribute?.translations, "de") as { name?: string })?.name ?? "" },
	values:
		attribute?.values.map((value) => ({
			id: value.id,
			code: value.code,
			labelEn: (translationFor(value.translations, "en") as { label?: string })?.label ?? "",
			labelDe: (translationFor(value.translations, "de") as { label?: string })?.label ?? "",
		})) ?? [],
})

/**
 * The values list.
 *
 * Rendered once, outside the locale tabs, with both label columns side by side —
 * unlike the attribute name, which is tabbed. Two reasons: these are short
 * paired labels ("Small" / "Klein") that read better together, and rendering a
 * useFieldArray inside each tab would mean two hooks driving the same array,
 * which desyncs the moment a row is added from one tab.
 */
const ValuesEditor = () => {
	const { control } = useFormContext<FormValues>()
	const { fields, append, remove } = useFieldArray({ control, name: "values" })

	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between">
				<div>
					<p className="text-sm font-medium">Values</p>
					<p className="text-muted-foreground text-xs">Order here is the order shoppers see. English is required.</p>
				</div>
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={() => append({ code: "", labelEn: "", labelDe: "" })}
				>
					<Plus />Add value</Button>
			</div>

			{!fields.length && (
				<p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-xs">
					No values yet. A variant axis needs at least one.
				</p>
			)}

			{fields.map((field, index) => (
				<div key={field.id} className="flex items-start gap-2">
					<GripVertical className="text-muted-foreground/50 mt-3 size-4 shrink-0" />
					<ProInput name={`values.${index}.code`} placeholder="code" className="w-32" />
					<ProInput
						name={`values.${index}.labelEn`}
						placeholder="Label (English)"
						className="flex-1"
					/>
					<ProInput
						name={`values.${index}.labelDe`}
						placeholder="Label (Deutsch)"
						className="flex-1"
					/>
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className="text-muted-foreground hover:text-destructive mt-0.5"
						aria-label={`Remove value ${index + 1}`}
						onClick={() => remove(index)}
					>
						<Trash2 />
					</Button>
				</div>
			))}
		</div>
	)
}

export const AttributeForm = ({ attribute }: { attribute?: AdminAttribute }) => {
	const t = useTranslations("admin")
	const router = useRouter()
	const [createAttribute] = useCreateAttributeMutation()
	const [updateAttribute] = useUpdateAttributeMutation()
	const [activeLocale, setActiveLocale] = useState<string>(EDITOR_LOCALES[0].code)

	const isEdit = !!attribute

	const onSubmit = async (form: FormValues) => {
		const payload: AttributePayload = {
			code: form.code.trim(),
			sortOrder: form.sortOrder,
			translations: [
				{ locale: "en", name: form.en.name.trim() },
				// A locale with no name is not sent — an empty translation row
				// would render as a blank attribute name.
				...(form.de.name.trim() ? [{ locale: "de", name: form.de.name.trim() }] : []),
			],
			values: form.values.map((value, index) => ({
				...(value.id ? { id: value.id } : {}),
				code: value.code.trim(),
				// Position is the order — no separate field to keep in step.
				sortOrder: index,
				translations: [
					{ locale: "en", label: value.labelEn.trim() },
					...(value.labelDe.trim() ? [{ locale: "de", label: value.labelDe.trim() }] : []),
				],
			})),
		}

		try {
			if (isEdit) {
				await updateAttribute({ id: attribute.id, data: payload }).unwrap()
				toast.success(t("attributeUpdated"))
			} else {
				await createAttribute(payload).unwrap()
				toast.success(t("attributeCreated"))
				router.push("/admin/dashboard/attributes")
			}
		} catch (error) {
			const message = (error as { data?: { message?: string } })?.data?.message
			toast.error(message ?? "Could not save the attribute.")
		}
	}

	return (
		<div className="space-y-6">
			<EditorHeader
				backHref="/admin/dashboard/attributes"
				backLabel="All attributes"
				title={
					isEdit
						? ((translationFor(attribute.translations, "en") as { name?: string })?.name ??
							attribute.code)
						: "New attribute"
				}
				description={t("variantAxesBuildProductVariantsDescriptive")}
			/>

			<ProForm
				key={attribute?.id ?? "new"}
				onSubmit={onSubmit}
				resolver={zodResolver(schema)}
				defaultValues={toDefaults(attribute)}
				className="space-y-6"
			>
				<div className="bg-card space-y-6 rounded-lg border p-5">
					<div className="grid gap-4 sm:grid-cols-2">
						<ProInput
							name="code"
							label={t("code")}
							description={t("usedInternallyAndInUrlsCannot")}
							required
						/>
						<ProInput name="sortOrder" type="number" label={t("sortOrder")} />
					</div>

					{/* No "used for variations" here, deliberately.
					    WooCommerce asks that on the product, not on the attribute —
					    the same attribute can build versions of one product and be
					    plain information on another. It appears in the product
					    editor as "Used for variations", next to "Visible on the
					    product page". */}
					<Tabs value={activeLocale} onValueChange={setActiveLocale}>
						<TabsList>
							{EDITOR_LOCALES.map(({ code, label }) => {
								const filled = !!(
									translationFor(attribute?.translations, code) as { name?: string }
								)?.name
								return (
									<TabsTrigger key={code} value={code} className="gap-2">
										{label}
										{isEdit && !filled && (
											<Badge variant="secondary" className="text-[10px]">
												empty
											</Badge>
										)}
									</TabsTrigger>
								)
							})}
						</TabsList>

						{EDITOR_LOCALES.map(({ code }) => (
							<TabsContent key={code} value={code} className="pt-4">
								<ProInput name={`${code}.name`} label={t("name")} required={code === "en"} />
							</TabsContent>
						))}
					</Tabs>
				</div>

				<div className="bg-card rounded-lg border p-5">
					<ValuesEditor />
				</div>

				<div className="flex justify-end gap-2">
					<Button asChild type="button" variant="ghost">
						<Link href="/admin/dashboard/attributes">{t("cancel")}</Link>
					</Button>
					<ProSubmit>{isEdit ? "Save changes" : "Create attribute"}</ProSubmit>
				</div>
			</ProForm>
		</div>
	)
}

export default AttributeForm
