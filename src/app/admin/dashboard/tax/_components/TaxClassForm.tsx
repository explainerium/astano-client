"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { z } from "zod"
import EditorHeader from "@/components/dashboard/shell/EditorHeader"
import ProCheckbox from "@/components/form/ProCheckbox"
import ProForm from "@/components/form/ProForm"
import ProInput from "@/components/form/ProInput"
import ProSubmit from "@/components/form/ProSubmit"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useCreateTaxClassMutation, useUpdateTaxClassMutation } from "@/redux/api/taxApi"
import type { TaxClass, TaxClassPayload } from "@/types/tax"

const EDITOR_LOCALES = [
	{ code: "en", label: "English" },
	{ code: "de", label: "Deutsch" },
] as const

const schema = z.object({
	code: z
		.string()
		.trim()
		.min(1, "Required")
		.max(60)
		.regex(/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/, "Lowercase letters, digits, - or _"),
	isDefault: z.boolean(),
	sortOrder: z.number({ message: "Enter a number" }).int().min(0),
	en: z.object({ name: z.string().trim().min(1, "An English name is required") }),
	de: z.object({ name: z.string().trim() }),
})

type FormValues = z.infer<typeof schema>

const nameFor = (taxClass: TaxClass | undefined, locale: string) =>
	taxClass?.translations.find((t) => t.locale === locale)?.name ?? ""

const toDefaults = (taxClass?: TaxClass): FormValues => ({
	code: taxClass?.code ?? "",
	isDefault: taxClass?.isDefault ?? false,
	sortOrder: taxClass?.sortOrder ?? 0,
	en: { name: nameFor(taxClass, "en") },
	de: { name: nameFor(taxClass, "de") },
})

export const TaxClassForm = ({ taxClass }: { taxClass?: TaxClass }) => {
	const router = useRouter()
	const [createTaxClass] = useCreateTaxClassMutation()
	const [updateTaxClass] = useUpdateTaxClassMutation()
	const [activeLocale, setActiveLocale] = useState<string>(EDITOR_LOCALES[0].code)

	const isEdit = !!taxClass

	const onSubmit = async (form: FormValues) => {
		const payload: TaxClassPayload = {
			code: form.code.trim(),
			isDefault: form.isDefault,
			sortOrder: form.sortOrder,
			translations: [
				{ locale: "en", name: form.en.name.trim() },
				// A locale with no name is not sent — an empty translation row would
				// render as a blank class name on that side of the admin.
				...(form.de.name.trim() ? [{ locale: "de", name: form.de.name.trim() }] : []),
			],
		}

		try {
			if (isEdit) {
				await updateTaxClass({ id: taxClass.id, data: payload }).unwrap()
				toast.success("Tax class updated.")
			} else {
				const created = await createTaxClass(payload).unwrap()
				toast.success("Tax class created.")
				// Into the class's own page, where its rates are added. A class with
				// no rates charges nothing, which is the mistake this avoids.
				router.replace(`/admin/dashboard/tax/classes/${created.id}/edit`)
			}
		} catch (error) {
			const message = (error as { data?: { message?: string } })?.data?.message
			toast.error(message ?? "Could not save the tax class.")
		}
	}

	return (
		<div className="space-y-6">
			<EditorHeader
				backHref="/admin/dashboard/tax"
				backLabel="All tax classes"
				title={isEdit ? taxClass.name : "New tax class"}
				description="A class groups rates. Products pick a class; the one marked default applies to any product that has not."
			/>

			<ProForm
				key={taxClass?.id ?? "new"}
				onSubmit={onSubmit}
				resolver={zodResolver(schema)}
				defaultValues={toDefaults(taxClass)}
				className="space-y-6"
			>
				<div className="bg-card space-y-6 rounded-lg border p-5">
					<div className="grid gap-4 sm:grid-cols-2">
						<ProInput
							name="code"
							label="Code"
							description="Used internally. Cannot contain spaces."
							required
						/>
						<ProInput name="sortOrder" type="number" label="Sort order" />
					</div>

					<Tabs value={activeLocale} onValueChange={setActiveLocale}>
						<TabsList>
							{EDITOR_LOCALES.map(({ code, label }) => (
								<TabsTrigger key={code} value={code} className="gap-2">
									{label}
									{isEdit && !nameFor(taxClass, code) && (
										<Badge variant="secondary" className="text-[10px]">
											empty
										</Badge>
									)}
								</TabsTrigger>
							))}
						</TabsList>

						{EDITOR_LOCALES.map(({ code }) => (
							<TabsContent key={code} value={code} className="pt-4">
								<ProInput name={`${code}.name`} label="Name" required={code === "en"} />
							</TabsContent>
						))}
					</Tabs>

					<ProCheckbox
						name="isDefault"
						label="Use as the default class"
						description="Applies to every product that has not picked a class of its own. Only one class can be the default — setting this clears the previous one."
						className="border-t pt-4"
					/>
				</div>

				<div className="flex justify-end gap-2">
					<Button asChild type="button" variant="ghost">
						<Link href="/admin/dashboard/tax">Cancel</Link>
					</Button>
					<ProSubmit>{isEdit ? "Save changes" : "Create class"}</ProSubmit>
				</div>
			</ProForm>
		</div>
	)
}

export default TaxClassForm
