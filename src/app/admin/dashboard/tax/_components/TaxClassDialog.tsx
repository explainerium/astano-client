"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { z } from "zod"
import ProCheckbox from "@/components/form/ProCheckbox"
import ProForm from "@/components/form/ProForm"
import ProInput from "@/components/form/ProInput"
import ProSubmit from "@/components/form/ProSubmit"
import { Badge } from "@/components/ui/badge"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog"
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

export const TaxClassDialog = ({
	open,
	onOpenChange,
	taxClass,
}: {
	open: boolean
	onOpenChange: (open: boolean) => void
	taxClass?: TaxClass
}) => {
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
				await createTaxClass(payload).unwrap()
				toast.success("Tax class created.")
			}
			onOpenChange(false)
		} catch (error) {
			const message = (error as { data?: { message?: string } })?.data?.message
			toast.error(message ?? "Could not save the tax class.")
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
				<DialogHeader>
					<DialogTitle>{isEdit ? "Edit tax class" : "New tax class"}</DialogTitle>
					<DialogDescription>
						A class groups rates. Products pick a class; the one marked default
						applies to any product that has not.
					</DialogDescription>
				</DialogHeader>

				<ProForm
					key={taxClass?.id ?? "new"}
					onSubmit={onSubmit}
					resolver={zodResolver(schema)}
					defaultValues={toDefaults(taxClass)}
					className="space-y-6"
				>
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

					<div className="flex justify-end border-t pt-4">
						<ProSubmit>{isEdit ? "Save changes" : "Create class"}</ProSubmit>
					</div>
				</ProForm>
			</DialogContent>
		</Dialog>
	)
}

export default TaxClassDialog
