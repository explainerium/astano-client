"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { z } from "zod"
import EditorHeader from "@/components/dashboard/shell/EditorHeader"
import ProCheckbox from "@/components/form/ProCheckbox"
import ProCombobox from "@/components/form/ProCombobox"
import ProForm from "@/components/form/ProForm"
import ProInput from "@/components/form/ProInput"
import ProSubmit from "@/components/form/ProSubmit"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { countryOptions } from "@/constants/countries"
import {
	useCreateShippingZoneMutation,
	useUpdateShippingZoneMutation,
} from "@/redux/api/shippingApi"
import type { ShippingZone, ShippingZonePayload } from "@/types/shipping"

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
	sortOrder: z.number({ message: "Enter a number" }).int().min(0),
	isActive: z.boolean(),
	countries: z.array(z.string()).min(1, "Pick at least one country"),
	en: z.object({ name: z.string().trim().min(1, "An English name is required") }),
	de: z.object({ name: z.string().trim() }),
})

type FormValues = z.infer<typeof schema>

const nameFor = (zone: ShippingZone | undefined, locale: string) =>
	zone?.translations.find((t) => t.locale === locale)?.name ?? ""

const toDefaults = (zone?: ShippingZone): FormValues => ({
	code: zone?.code ?? "",
	sortOrder: zone?.sortOrder ?? 0,
	isActive: zone?.isActive ?? true,
	countries: zone?.countries ?? [],
	en: { name: nameFor(zone, "en") },
	de: { name: nameFor(zone, "de") },
})

export const ZoneForm = ({ zone }: { zone?: ShippingZone }) => {
	const router = useRouter()
	const [createZone] = useCreateShippingZoneMutation()
	const [updateZone] = useUpdateShippingZoneMutation()
	const [activeLocale, setActiveLocale] = useState<string>(EDITOR_LOCALES[0].code)

	const isEdit = !!zone

	const onSubmit = async (form: FormValues) => {
		const payload: ShippingZonePayload = {
			code: form.code.trim(),
			sortOrder: form.sortOrder,
			isActive: form.isActive,
			countries: form.countries,
			translations: [
				{ locale: "en", name: form.en.name.trim() },
				...(form.de.name.trim() ? [{ locale: "de", name: form.de.name.trim() }] : []),
			],
		}

		try {
			if (isEdit) {
				await updateZone({ id: zone.id, data: payload }).unwrap()
				toast.success("Zone updated.")
			} else {
				const created = await createZone(payload).unwrap()
				toast.success("Zone created.")
				// Into the new zone's own page, where its first method is added. A
				// zone with no methods offers no shipping, so leaving the admin on
				// the list would hide the half-finished state behind a scroll.
				router.replace(`/admin/dashboard/shipping/zones/${created.id}/edit`)
			}
		} catch (error) {
			// A country already claimed by another zone is refused by the API.
			const message = (error as { data?: { message?: string } })?.data?.message
			toast.error(message ?? "Could not save the zone.")
		}
	}

	return (
		<div className="space-y-6">
			<EditorHeader
				backHref="/admin/dashboard/shipping"
				backLabel="All shipping zones"
				title={isEdit ? zone.name : "New zone"}
				description="A zone is a group of countries that share the same rates. Each country belongs to exactly one zone."
			/>

			<ProForm
				key={zone?.id ?? "new"}
				onSubmit={onSubmit}
				resolver={zodResolver(schema)}
				defaultValues={toDefaults(zone)}
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
									{isEdit && !nameFor(zone, code) && (
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

					<ProCombobox
						name="countries"
						label="Countries"
						multiple
						options={countryOptions("en")}
						placeholder="No countries"
						description="A country can only be in one zone. Adding one that already belongs elsewhere is refused."
					/>

					<ProCheckbox
						name="isActive"
						label="Active"
						description="An inactive zone offers no shipping at all to its countries."
						className="border-t pt-4"
					/>
				</div>

				<div className="flex justify-end gap-2">
					<Button asChild type="button" variant="ghost">
						<Link href="/admin/dashboard/shipping">Cancel</Link>
					</Button>
					<ProSubmit>{isEdit ? "Save changes" : "Create zone"}</ProSubmit>
				</div>
			</ProForm>
		</div>
	)
}

export default ZoneForm
