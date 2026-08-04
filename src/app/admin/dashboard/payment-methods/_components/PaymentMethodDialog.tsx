"use client"

import { useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { z } from "zod"
import ProCheckbox from "@/components/form/ProCheckbox"
import ProCombobox from "@/components/form/ProCombobox"
import ProForm from "@/components/form/ProForm"
import ProInput from "@/components/form/ProInput"
import ProSelect from "@/components/form/ProSelect"
import ProSubmit from "@/components/form/ProSubmit"
import ProTextarea from "@/components/form/ProTextarea"
import { Badge } from "@/components/ui/badge"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { countryOptions } from "@/constants/countries"
import {
	useCreatePaymentMethodMutation,
	useUpdatePaymentMethodMutation,
} from "@/redux/api/paymentApi"
import type { PaymentMethod, PaymentMethodPayload, PaymentRole } from "@/types/payment"

const EDITOR_LOCALES = [
	{ code: "en", label: "English" },
	{ code: "de", label: "Deutsch" },
] as const

const TYPES = [
	{ label: "Bank transfer", value: "BANK_TRANSFER" },
	{ label: "Invoice", value: "INVOICE" },
	{ label: "Cash on delivery", value: "CASH_ON_DELIVERY" },
	{ label: "Other", value: "OTHER" },
]

const ROLE_OPTIONS = [
	{ label: "Guest (not signed in)", value: "GUEST" },
	{ label: "Retail customer", value: "B2C" },
	{ label: "Approved dealer", value: "RESELLER" },
	{ label: "Shop manager", value: "SHOP_MANAGER" },
	{ label: "Admin", value: "ADMIN" },
]

const money = z
	.string()
	.trim()
	.refine((v) => v === "" || /^\d+(\.\d{1,4})?$/.test(v), { message: "Use a number like 250.00" })

const schema = z
	.object({
		code: z
			.string()
			.trim()
			.min(1, "Required")
			.max(60)
			.regex(/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/, "Lowercase letters, digits, - or _"),
		type: z.enum(["BANK_TRANSFER", "INVOICE", "CASH_ON_DELIVERY", "OTHER"]),
		isActive: z.boolean(),
		sortOrder: z.number({ message: "Enter a number" }).int().min(0),
		en: z.object({
			title: z.string().trim().min(1, "An English title is required"),
			description: z.string().trim().max(2000),
			instructions: z.string().trim().max(4000),
		}),
		de: z.object({
			title: z.string().trim(),
			description: z.string().trim().max(2000),
			instructions: z.string().trim().max(4000),
		}),
		allowedCountries: z.array(z.string()),
		allowedRoles: z.array(z.string()),
		requiresLogin: z.boolean(),
		minCompletedOrders: z.number({ message: "Enter a number" }).int().min(0),
		minOrderTotal: money,
		maxOrderTotal: money,
		requiresValidatedVatId: z.boolean(),
	})
	.superRefine((values, ctx) => {
		const min = values.minOrderTotal.trim()
		const max = values.maxOrderTotal.trim()

		if (min && max && Number(max) <= Number(min)) {
			ctx.addIssue({
				code: "custom",
				path: ["maxOrderTotal"],
				message: "Must be above the minimum, or no order can ever qualify.",
			})
		}

		// Requiring past orders without requiring a sign-in can never match: a
		// guest has no order history to count.
		if (values.minCompletedOrders > 0 && !values.requiresLogin) {
			ctx.addIssue({
				code: "custom",
				path: ["requiresLogin"],
				message: "Counting past orders needs a signed-in customer.",
			})
		}
	})

type FormValues = z.infer<typeof schema>

const translationFor = (method: PaymentMethod | undefined, locale: string) =>
	method?.translations.find((t) => t.locale === locale)

const toDefaults = (method?: PaymentMethod): FormValues => ({
	code: method?.code ?? "",
	type: method?.type ?? "BANK_TRANSFER",
	isActive: method?.isActive ?? true,
	sortOrder: method?.sortOrder ?? 0,
	en: {
		title: translationFor(method, "en")?.title ?? "",
		description: translationFor(method, "en")?.description ?? "",
		instructions: translationFor(method, "en")?.instructions ?? "",
	},
	de: {
		title: translationFor(method, "de")?.title ?? "",
		description: translationFor(method, "de")?.description ?? "",
		instructions: translationFor(method, "de")?.instructions ?? "",
	},
	allowedCountries: method?.rules.allowedCountries ?? [],
	allowedRoles: method?.rules.allowedRoles ?? [],
	requiresLogin: method?.rules.requiresLogin ?? false,
	minCompletedOrders: method?.rules.minCompletedOrders ?? 0,
	minOrderTotal: method?.rules.minOrderTotal ? String(Number(method.rules.minOrderTotal)) : "",
	maxOrderTotal: method?.rules.maxOrderTotal ? String(Number(method.rules.maxOrderTotal)) : "",
	requiresValidatedVatId: method?.rules.requiresValidatedVatId ?? false,
})

export const PaymentMethodDialog = ({
	open,
	onOpenChange,
	method,
}: {
	open: boolean
	onOpenChange: (open: boolean) => void
	method?: PaymentMethod
}) => {
	const [createMethod] = useCreatePaymentMethodMutation()
	const [updateMethod] = useUpdatePaymentMethodMutation()
	const [activeLocale, setActiveLocale] = useState<string>(EDITOR_LOCALES[0].code)

	const isEdit = !!method

	const onSubmit = async (form: FormValues) => {
		const block = (code: "en" | "de") => ({
			locale: code,
			title: form[code].title.trim(),
			...(form[code].description.trim() ? { description: form[code].description.trim() } : {}),
			...(form[code].instructions.trim() ? { instructions: form[code].instructions.trim() } : {}),
		})

		const payload: PaymentMethodPayload = {
			code: form.code.trim(),
			type: form.type,
			isActive: form.isActive,
			sortOrder: form.sortOrder,
			allowedCountries: form.allowedCountries,
			allowedRoles: form.allowedRoles as PaymentRole[],
			requiresLogin: form.requiresLogin,
			minCompletedOrders: form.minCompletedOrders,
			minOrderTotal: form.minOrderTotal.trim() || null,
			maxOrderTotal: form.maxOrderTotal.trim() || null,
			requiresValidatedVatId: form.requiresValidatedVatId,
			translations: [block("en"), ...(form.de.title.trim() ? [block("de")] : [])],
		}

		try {
			if (isEdit) {
				await updateMethod({ id: method.id, data: payload }).unwrap()
				toast.success("Payment method updated.")
			} else {
				await createMethod(payload).unwrap()
				toast.success("Payment method created.")
			}
			onOpenChange(false)
		} catch (error) {
			const message = (error as { data?: { message?: string } })?.data?.message
			toast.error(message ?? "Could not save the payment method.")
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
				<DialogHeader>
					<DialogTitle>{isEdit ? "Edit payment method" : "New payment method"}</DialogTitle>
					<DialogDescription>
						What the customer can pay with, and who is offered it.
					</DialogDescription>
				</DialogHeader>

				<ProForm
					key={method?.id ?? "new"}
					onSubmit={onSubmit}
					resolver={zodResolver(schema)}
					defaultValues={toDefaults(method)}
					className="space-y-6"
				>
					<div className="grid gap-4 sm:grid-cols-3">
						<ProInput name="code" label="Code" required />
						<ProSelect name="type" label="Type" options={TYPES} />
						<ProInput name="sortOrder" type="number" label="Sort order" />
					</div>

					<Tabs value={activeLocale} onValueChange={setActiveLocale}>
						<TabsList>
							{EDITOR_LOCALES.map(({ code, label }) => (
								<TabsTrigger key={code} value={code} className="gap-2">
									{label}
									{isEdit && !translationFor(method, code)?.title && (
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
									name={`${code}.title`}
									label="Title"
									description="The name shown at checkout."
									required={code === "en"}
								/>
								<ProTextarea
									name={`${code}.description`}
									label="Description"
									description="The line under the title at checkout."
								/>
								<ProTextarea
									name={`${code}.instructions`}
									label="Instructions after ordering"
									description="Shown on the thank-you page and in the confirmation email. Bank account details belong here — this is the text the customer actually reads."
								/>
							</TabsContent>
						))}
					</Tabs>

					<div className="space-y-4 border-t pt-5">
						<div>
							<h3 className="text-sm font-medium">Who can use it</h3>
							<p className="text-muted-foreground mt-1 max-w-prose text-xs">
								Every setting narrows. Leaving a list empty places no restriction
								at all rather than excluding everyone.
							</p>
						</div>

						<ProCombobox
							name="allowedCountries"
							label="Countries"
							multiple
							options={countryOptions("en")}
							placeholder="Every country"
						/>

						<ProCombobox
							name="allowedRoles"
							label="Customer types"
							multiple
							options={ROLE_OPTIONS}
							placeholder="Every customer type"
						/>

						<div className="grid gap-4 sm:grid-cols-2">
							<ProInput
								name="minOrderTotal"
								label="Minimum order total"
								placeholder="No minimum"
							/>
							<ProInput
								name="maxOrderTotal"
								label="Maximum order total"
								placeholder="No maximum"
							/>
						</div>

						<ProInput
							name="minCompletedOrders"
							type="number"
							label="Completed orders required"
							description="0 offers it to first-time buyers. The live site sets this to 1 for the invoice gateway, so only returning customers see it."
							className="sm:max-w-xs"
						/>

						<ProCheckbox
							name="requiresLogin"
							label="Signed-in customers only"
						/>
						<ProCheckbox
							name="requiresValidatedVatId"
							label="Requires a validated VAT ID"
							description="Only businesses whose VAT number has passed VIES."
						/>
					</div>

					<ProCheckbox
						name="isActive"
						label="Active"
						description="An inactive method is never offered, whatever the rules say."
						className="border-t pt-4"
					/>

					<div className="flex justify-end border-t pt-4">
						<ProSubmit>{isEdit ? "Save changes" : "Create method"}</ProSubmit>
					</div>
				</ProForm>
			</DialogContent>
		</Dialog>
	)
}

export default PaymentMethodDialog
