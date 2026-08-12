"use client"

import { useLocale, useTranslations } from "next-intl"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { useFormContext, useFormState } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { z } from "zod"
import ProCheckbox from "@/components/form/ProCheckbox"
import ProCombobox from "@/components/form/ProCombobox"
import ProForm from "@/components/form/ProForm"
import ProInput from "@/components/form/ProInput"
import ProSubmit from "@/components/form/ProSubmit"
import ProTextarea from "@/components/form/ProTextarea"
import Panel from "@/components/dashboard/shell/Panel"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { countryOptions } from "@/constants/countries"
import { useUpdatePaymentMethodMutation } from "@/redux/api/paymentApi"
import type {
	PaymentMethod,
	PaymentMethodPayload,
	PaymentMethodType,
	PaymentRole,
} from "@/types/payment"
import BankAccountsField from "./BankAccountsField"

/**
 * The offline-method editor.
 *
 * Was a dialog. It is a page now for the same reason the gateway settings are:
 * there is a locale switcher, an eligibility section and a long instructions
 * field that carries the shop's bank details — and the person filling it in is
 * usually copying from somewhere else. A modal makes all of that harder and
 * buys nothing.
 */

const EDITOR_LOCALES = [
	{ code: "en", label: "English" },
	{ code: "de", label: "Deutsch" },
] as const

/** The dashboard translator, as a type these builders can take. */
type T = (key: string, values?: Record<string, string | number | Date>) => string

const roleOptions = (t: T) => [
	{ label: t("roleGuestNotSignedIn"), value: "GUEST" },
	{ label: t("roleRetailCustomer"), value: "B2C" },
	{ label: t("roleApprovedDealer"), value: "RESELLER" },
	{ label: t("roleShopManager"), value: "SHOP_MANAGER" },
	{ label: t("roleAdmin"), value: "ADMIN" },
]

const money = (t: T) =>
	z
		.string()
		.trim()
		.refine((v) => v === "" || /^\d+(\.\d{1,4})?$/.test(v), {
			message: t("useANumberLike25000"),
		})

/**
 * Mirrors the backend's bankAccountSchema, with one difference: every field is
 * a string here, because that is what an empty input produces. The blanks are
 * stripped on submit.
 *
 * The IBAN and BIC patterns check shape, not validity. A checksum test would
 * reject perfectly good test values and make the field feel broken during
 * setup — and the bank rejects a wrong one anyway.
 */
const bankAccount = (t: T) =>
	z.object({
	label: z.string().trim().max(80),
	accountName: z.string().trim().max(120),
	bankName: z.string().trim().max(120),
	accountNumber: z.string().trim().max(60),
	iban: z
		.string()
		.trim()
		.max(42)
		.refine((v) => v === "" || /^[A-Za-z]{2}[0-9A-Za-z\s]{10,40}$/.test(v), {
			message: t("thatDoesNotLookLikeAn"),
		}),
	bic: z
		.string()
		.trim()
		.max(11)
		.refine((v) => v === "" || /^[A-Za-z]{6}[0-9A-Za-z]{2}([0-9A-Za-z]{3})?$/.test(v), {
			message: t("bicFormat"),
		}),
	countryCode: z
		.string()
		.trim()
		.max(2)
		.refine((v) => v === "" || v.length === 2, { message: t("useA2LetterCountryCode") }),
})

const buildSchema = (type: PaymentMethodType, t: T) =>
	z
		.object({
		isActive: z.boolean(),
		en: z.object({
			title: z.string().trim().min(1, t("anEnglishTitleIsRequired")),
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
		minCompletedOrders: z.number({ message: t("enterANumber") }).int().min(0),
		minOrderTotal: money(t),
		maxOrderTotal: money(t),
		requiresValidatedVatId: z.boolean(),
		bankAccounts: z.array(bankAccount(t)),
	})
	.superRefine((values, ctx) => {
		/*
		 * A bank transfer with nowhere to transfer to.
		 *
		 * Checked only when the method is active, so a half-finished draft can be
		 * saved and come back to. Once it is switched on, a customer will be told
		 * to pay by transfer and given no account — the single worst outcome this
		 * form can produce.
		 */
		if (type === "BANK_TRANSFER" && values.isActive) {
			const usable = values.bankAccounts.filter(
				(account) => account.iban.trim() || account.accountNumber.trim()
			)

			if (!usable.length) {
				ctx.addIssue({
					code: "custom",
					path: ["bankAccounts"],
					message: t("addAnAccountWithAnIban"),
				})
			}
		}

		const min = values.minOrderTotal.trim()
		const max = values.maxOrderTotal.trim()

		if (min && max && Number(max) <= Number(min)) {
			ctx.addIssue({
				code: "custom",
				path: ["maxOrderTotal"],
				message: t("mustBeAboveTheMinimumOr"),
			})
		}

		// Requiring past orders without requiring a sign-in can never match: a
		// guest has no order history to count.
		if (values.minCompletedOrders > 0 && !values.requiresLogin) {
			ctx.addIssue({
				code: "custom",
				path: ["requiresLogin"],
				message: t("countingPastOrdersNeedsASigned"),
			})
		}
	})

type FormValues = z.infer<ReturnType<typeof buildSchema>>

const translationFor = (method: PaymentMethod, locale: string) =>
	method.translations.find((t) => t.locale === locale)

const toDefaults = (method: PaymentMethod): FormValues => ({
	isActive: method?.isActive ?? true,
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
	bankAccounts: readAccounts(method?.config),
})

/**
 * `config` is a free-form JSON column typed as `unknown`, so this reads its own
 * key defensively and fills every field — an input bound to `undefined` becomes
 * uncontrolled and React complains the moment somebody types.
 */
const readAccounts = (config: unknown): z.infer<ReturnType<typeof bankAccount>>[] => {
	const raw = (config as { bankAccounts?: unknown } | null)?.bankAccounts
	if (!Array.isArray(raw)) return []

	return raw.map((entry) => {
		const account = (entry ?? {}) as Record<string, unknown>
		const text = (key: string) => (typeof account[key] === "string" ? (account[key] as string) : "")

		return {
			label: text("label"),
			accountName: text("accountName"),
			bankName: text("bankName"),
			accountNumber: text("accountNumber"),
			iban: text("iban"),
			bic: text("bic"),
			countryCode: text("countryCode"),
		}
	})
}

/**
 * The bank-details panel, shown only for a bank transfer.
 *
 * Its own component so it can watch the type field. `useWatch` with the context
 * control, never `watch()` — the latter subscribes the component that called
 * `useForm`, which here is ProForm, and re-renders the entire form on every
 * keystroke in every field.
 */
const BankAccountsPanel = ({ type }: { type: PaymentMethodType }) => {
	const t = useTranslations("admin")
	const { control } = useFormContext()
	const error = useFormState({ control, name: "bankAccounts" }).errors.bankAccounts

	if (type !== "BANK_TRANSFER") return null

	return (
		<Panel title={t("bankDetails")}>
			<p className="text-muted-foreground mb-4 max-w-prose text-sm">
				{t("bankDetailsBlurb")}
			</p>

			<BankAccountsField />

			{/* The array-level error: active, but nowhere to send the money. */}
			{typeof error?.message === "string" && (
				<p className="text-destructive mt-3 text-sm">{error.message}</p>
			)}
		</Panel>
	)
}

export const PaymentMethodForm = ({ method }: { method: PaymentMethod }) => {
	const t = useTranslations("admin")
	const locale = useLocale()
	const router = useRouter()
	const [updateMethod] = useUpdatePaymentMethodMutation()
	const [activeLocale, setActiveLocale] = useState<string>(EDITOR_LOCALES[0].code)

	const onSubmit = async (form: FormValues) => {
		const block = (code: "en" | "de") => ({
			locale: code,
			title: form[code].title.trim(),
			...(form[code].description.trim() ? { description: form[code].description.trim() } : {}),
			...(form[code].instructions.trim() ? { instructions: form[code].instructions.trim() } : {}),
		})

		/*
		 * Blanks are dropped, not stored as empty strings.
		 *
		 * The renderers skip absent fields, so an account with only an IBAN and a
		 * BIC prints two rows rather than six with four gaps. Accounts with no
		 * usable number at all are discarded — an empty row the admin added and
		 * did not fill has nothing to say to a customer.
		 */
		const accounts = form.bankAccounts
			.map((account) =>
				Object.fromEntries(
					Object.entries(account)
						.map(([key, value]) => [key, value.trim()])
						.filter(([, value]) => value !== "")
				)
			)
			.filter((account) => account.iban || account.accountNumber || account.accountName)

		const payload: PaymentMethodPayload = {
			// Merged, not replaced: config is shared and may hold settings this
			// form knows nothing about.
			config: {
				...((method?.config as Record<string, unknown> | null) ?? {}),
				bankAccounts: accounts,
			},
			isActive: form.isActive,
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
			await updateMethod({ id: method.id, data: payload }).unwrap()
			toast.success(t("paymentMethodUpdated"))
			router.push("/admin/dashboard/payments")
		} catch (error) {
			const message = (error as { data?: { message?: string } })?.data?.message
			toast.error(message ?? t("couldNotSaveThePaymentMethod"))
		}
	}

	return (
		<ProForm
			key={method.id}
			onSubmit={onSubmit}
			resolver={zodResolver(buildSchema(method.type, t))}
			defaultValues={toDefaults(method)}
			className="space-y-5"
		>
			<Panel title={t("whatTheCustomerReads")}>
				<Tabs value={activeLocale} onValueChange={setActiveLocale}>
					<TabsList>
						{EDITOR_LOCALES.map(({ code, label }) => (
							<TabsTrigger key={code} value={code} className="gap-2">
								{label}
								{!translationFor(method, code)?.title && (
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
								label={t("title")}
								description={t("theNameShownAtCheckout")}
								required={code === "en"}
							/>
							<ProTextarea
								name={`${code}.description`}
								label={t("description")}
								description={t("theLineUnderTheTitleAt")}
							/>
							<ProTextarea
								name={`${code}.instructions`}
								label={t("instructionsAfterOrdering")}
								description={t("shownOnTheThankYouPage")}
							/>
						</TabsContent>
					))}
				</Tabs>
			</Panel>

			<BankAccountsPanel type={method.type} />

			<Panel title={t("whoCanUseIt")}>
				<p className="text-muted-foreground mb-4 max-w-prose text-xs">
					{t("everySettingNarrows")}
				</p>

				<div className="space-y-4">
					<ProCombobox
						name="allowedCountries"
						label={t("countries")}
						multiple
						options={countryOptions(locale)}
						placeholder={t("everyCountry")}
					/>

					<ProCombobox
						name="allowedRoles"
						label={t("customerTypes")}
						multiple
						options={roleOptions(t)}
						placeholder={t("everyCustomerType")}
					/>

					<div className="grid gap-4 sm:grid-cols-2">
						<ProInput name="minOrderTotal" label={t("minimumOrderTotal")} placeholder={t("noMinimum")} />
						<ProInput name="maxOrderTotal" label={t("maximumOrderTotal")} placeholder={t("noMaximum")} />
					</div>

					<ProInput
						name="minCompletedOrders"
						type="number"
						label={t("completedOrdersRequired")}
						description={t("0OffersItToFirstTime")}
						className="sm:max-w-xs"
					/>

					<ProCheckbox name="requiresLogin" label={t("signedInCustomersOnly")} />
					<ProCheckbox
						name="requiresValidatedVatId"
						label={t("requiresAValidatedVatId")}
						description={t("onlyBusinessesWhoseVatNumberHas")}
					/>
				</div>
			</Panel>

			<Panel>
				<ProCheckbox
					name="isActive"
					label={t("offerAtCheckout")}
					description={t("inactiveMethodNeverOffered")}
				/>

				<div className="mt-5 flex justify-end gap-2 border-t pt-4">
					<Button type="button" variant="outline" onClick={() => router.push("/admin/dashboard/payments")}>{t("cancel")}</Button>
					<ProSubmit>{t("saveChanges")}</ProSubmit>
				</div>
			</Panel>
		</ProForm>
	)
}

export default PaymentMethodForm
