"use client"

import { useTranslations } from "next-intl"
import { useState } from "react"
import Link from "next/link"
import {
	Banknote,
	CircleAlert,
	CircleCheck,
	CreditCard,
	FileText,
	Landmark,
	Loader2,
	Settings2,
	Trash2,
	Wallet,
} from "lucide-react"
import { toast } from "sonner"
import Panel from "@/components/dashboard/shell/Panel"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import {
	useDeletePaymentMethodMutation,
	usePaymentMethodsQuery,
	useUpdatePaymentMethodMutation,
} from "@/redux/api/paymentApi"
import {
	usePaymentGatewaysQuery,
	useUpdateGatewaySettingsMutation,
} from "@/redux/api/paymentGatewayApi"
import { cn } from "@/lib/utils"
import useCountryName from "@/lib/useCountryName"
import { pickTranslation } from "@/lib/pickTranslation"
import type { PaymentMethod } from "@/types/payment"
import type { PaymentGatewayView } from "@/types/paymentGateway"

const GATEWAY_ICON = { STRIPE: CreditCard, PAYPAL: Wallet } as const

/** One icon per kind, so the list is scannable without reading it. */
const METHOD_ICON: Record<string, typeof Landmark> = {
	BANK_TRANSFER: Landmark,
	INVOICE: FileText,
	CASH_ON_DELIVERY: Banknote,
}

/** Keys, resolved where the sentence is built — this map has no locale. */
const ROLE_LABEL: Record<string, string> = {
	GUEST: "roleGuests",
	B2C: "roleRetailCustomers",
	RESELLER: "roleDealers",
	SHOP_MANAGER: "roleShopManagers",
	ADMIN: "roleAdmins",
}

/**
 * The eligibility rules as a sentence, so nobody has to open the editor to read
 * them.
 *
 * Takes  rather than reaching for it: this is a plain function outside any
 * component, so there is no hook to call here.
 */
const describeRules = (
	method: PaymentMethod,
	t: (key: string, values?: Record<string, string | number | Date>) => string,
	/** Country names in the reader's language; see useCountryName. */
	countryName: (code: string) => string | null
): string[] => {
	const { rules } = method
	const lines: string[] = []

	if (rules.allowedCountries.length) {
		lines.push(t("onlyCountries", { countries: rules.allowedCountries.map((code) => countryName(code) ?? code).join(", ") }))
	}
	if (rules.allowedRoles.length) {
		lines.push(
			t("onlyRoles", {
				roles: rules.allowedRoles.map((r) => (ROLE_LABEL[r] ? t(ROLE_LABEL[r]) : r)).join(", "),
			})
		)
	}
	if (rules.requiresLogin) lines.push(t("signedInCustomersOnly"))
	if (rules.minCompletedOrders > 0) {
		lines.push(
			t("afterCompletedOrders", { count: rules.minCompletedOrders })
		)
	}
	if (rules.minOrderTotal) lines.push(t("ordersFrom", { amount: `€${Number(rules.minOrderTotal)}` }))
	if (rules.maxOrderTotal) lines.push(t("ordersUpTo", { amount: `€${Number(rules.maxOrderTotal)}` }))
	if (rules.requiresValidatedVatId) lines.push(t("validatedVatIdRequired"))

	return lines
}

/** Which step a gateway is stuck on, in words that say what to do next. */
const gatewayStatus = (
	gateway: PaymentGatewayView,
	t: (key: string, values?: Record<string, string | number | Date>) => string
) => {
	const stored = gateway.credentials[gateway.mode] ?? {}
	const configured = gateway.fields
		.filter((field) => field.required)
		.every((field) => stored[field.key]?.isSet)

	if (gateway.isActive) {
		return gateway.mode === "LIVE"
			? { label: t("gatewayLive"), tone: "bg-positive-soft text-positive" }
			: { label: t("gatewayTestMode"), tone: "bg-accent-soft-strong text-primary" }
	}
	if (!configured) return { label: t("gatewayNotSetUp"), tone: "bg-muted text-muted-foreground" }
	if (gateway.lastTest?.succeeded) {
		return { label: t("gatewayReadyOff"), tone: "bg-accent-soft text-accent-foreground" }
	}
	return { label: t("gatewayNeedsTesting"), tone: "bg-accent-soft text-accent-foreground" }
}

/**
 * A bank transfer with no account behind it.
 *
 * Worth surfacing in the list rather than only inside the editor: this is the
 * one misconfiguration that reaches a customer as "pay by transfer" with
 * nowhere to send the money.
 */
const missingBankDetails = (method: PaymentMethod): boolean => {
	if (method.type !== "BANK_TRANSFER") return false

	const accounts = (method.config as { bankAccounts?: unknown[] } | null)?.bankAccounts
	return !Array.isArray(accounts) || accounts.length === 0
}

const errorMessage = (error: unknown, fallback: string) =>
	(error as { data?: { message?: string } })?.data?.message ?? fallback

/**
 * Payments — everything a customer can pay with, on one screen.
 *
 * Gateways and offline methods were two routes, and that was a distinction only
 * a developer cares about: to whoever runs the shop, "Stripe" and "Bank
 * transfer" are both simply ways to be paid.
 *
 * Nothing here is created or deleted. The offline kinds are a closed set the
 * API materialises on first read, exactly as the gateways are — so this is a
 * list of switches, not a builder. The previous version asked an admin to
 * invent a method and pick its "type" from a dropdown, which put a Type field
 * inside the Bank transfer settings offering to turn it into an invoice.
 */
export default function PaymentsPage() {
	const countryName = useCountryName()
	const t = useTranslations("admin")
	const gateways = usePaymentGatewaysQuery()
	const methods = usePaymentMethodsQuery()

	const [updateGateway] = useUpdateGatewaySettingsMutation()
	const [updateMethod] = useUpdatePaymentMethodMutation()
	const [removeMethod] = useDeletePaymentMethodMutation()

	const [busy, setBusy] = useState<string | null>(null)

	const isLoading = gateways.isLoading || methods.isLoading
	const loadError = gateways.error ?? methods.error

	const run = async (id: string, action: () =>Promise<unknown>, success: string) => {
		setBusy(id)
		try {
			await action()
			toast.success(success)
		} catch (error) {
			toast.error(errorMessage(error, "Could not update the payment option."))
		}
		setBusy(null)
	}

	const activeCount =
		(gateways.data?.filter((g) => g.isActive).length ?? 0) +
		(methods.data?.filter((m) => m.isActive).length ?? 0)

	return (
		<div className="space-y-5">
			<div>
				<h1 className="font-heading text-xl font-semibold tracking-tight">{t("payments")}</h1>
				<p className="text-muted-foreground text-sm">
					{t("paymentOptionsOffered", { count: activeCount })}
				</p>
			</div>

			{isLoading && (
				<div className="bg-card text-muted-foreground flex items-center justify-center gap-2 rounded-lg border p-16 text-sm">
					<Loader2 className="size-4 animate-spin" />{t("loadingPaymentOptions")}</div>
			)}

			{/* `!!` because the base query types its error as `unknown`, and an
			    unknown left in a && lands in the JSX as a non-renderable value. */}
			{!!loadError && (
				<div className="text-destructive bg-card rounded-lg border border-dashed p-16 text-center text-sm">
					{errorMessage(loadError, "Could not load the payment options.")}
				</div>
			)}

			{/* ── Gateways ──────────────────────────────────────────────────── */}
			{!!gateways.data?.length && (
				<Panel title={t("cardAndWalletPayments")}>
					<p className="text-muted-foreground mb-4 text-sm">
						Paid online, through a provider. Connect your own account, run a connection test,
						then switch it on.
					</p>

					<ul className="divide-y">
						{gateways.data.map((gateway) => {
							const status = gatewayStatus(gateway, t)
							const Icon = GATEWAY_ICON[gateway.provider]
							const canEnable =
								gateway.lastTest?.succeeded === true && gateway.lastTest.mode === gateway.mode

							return (
								<li key={gateway.provider} className="flex items-start gap-4 py-4 first:pt-0">
									<span className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-lg">
										<Icon className="size-4" strokeWidth={1.75} />
									</span>

									<div className="min-w-0 flex-1">
										<div className="flex flex-wrap items-center gap-2">
											<span className="text-sm font-medium">{gateway.label}</span>
											<Badge variant="outline" className={cn("border-transparent", status.tone)}>
												{status.label}
											</Badge>
										</div>

										<p className="text-muted-foreground mt-0.5 text-xs">
											{gateway.isActive
												? gateway.methods
														.filter((m) => gateway.enabledMethods.includes(m.code))
														.map((m) => m.label)
														.join(" · ") || t("noMethodsEnabled")
												: gateway.provider === "STRIPE"
													? t("stripeBlurb")
													: t("paypalBlurb")}
										</p>

										{gateway.lastTest && (
											<p
												className={cn(
													"mt-1.5 flex items-start gap-1.5 text-xs",
													gateway.lastTest.succeeded ? "text-positive" : "text-muted-foreground"
												)}
											>
												{gateway.lastTest.succeeded ? (
													<CircleCheck className="mt-px size-3 shrink-0" />
												) : (
													<CircleAlert className="mt-px size-3 shrink-0" />
												)}
												<span>{gateway.lastTest.message}</span>
											</p>
										)}
									</div>

									<div className="flex shrink-0 items-center gap-3">
										<Switch
											checked={gateway.isActive}
											aria-label={t("offerThingAtCheckout", { name: gateway.label })}
											// The API refuses this too. Disabled here so the switch is
											// never a button whose only outcome is an error.
											disabled={busy === gateway.provider || (!gateway.isActive && !canEnable)}
											onCheckedChange={(checked) =>
												run(
													gateway.provider,
													() =>
														updateGateway({
															provider: gateway.provider,
															isActive: checked,
														}).unwrap(),
													checked
										? t("switchedOnThing", { name: gateway.label })
										: t("switchedOffThing", { name: gateway.label })
												)
											}
										/>

										<Button asChild variant="outline" size="sm">
											<Link href={`/admin/dashboard/payments/gateways/${gateway.provider}`}>
												<Settings2 />
												{gateway.lastTest?.succeeded ? t("manage") : t("setUp")}
											</Link>
										</Button>
									</div>
								</li>
							)
						})}
					</ul>
				</Panel>
			)}

			{/* ── Offline methods ───────────────────────────────────────────── */}
			{!!methods.data?.length && (
				<Panel title={t("offlinePayments")}>
					<p className="text-muted-foreground mb-4 text-sm">{t("paidOutsideTheShopTheOrder")}</p>

					<ul className="divide-y">
						{methods.data.map((method) => {
							const rules = describeRules(method, t, countryName)
							const Icon = METHOD_ICON[method.type] ?? Landmark
							const incomplete = missingBankDetails(method)

							// `title` is resolved for the request locale; the description only
							// exists per translation. The admin is English, so English first.
							const description =
								pickTranslation(method.translations)?.description

							return (
								<li key={method.id} className="flex items-start gap-4 py-4 first:pt-0">
									<span className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-lg">
										<Icon className="size-4" strokeWidth={1.75} />
									</span>

									<div className="min-w-0 flex-1">
										<div className="flex flex-wrap items-center gap-2">
											<span className="text-sm font-medium">{method.title}</span>
											{incomplete && (
												<Badge
													variant="outline"
													className="border-transparent bg-accent-soft text-accent-foreground"
												>
													{t("noBankDetails")}
												</Badge>
											)}
										</div>

										{description && (
											<p className="text-muted-foreground mt-0.5 text-xs">{description}</p>
										)}

										{!!rules.length && (
											<p className="text-muted-foreground mt-1.5 text-xs">{rules.join(" · ")}</p>
										)}

										{incomplete && (
											<p className="text-muted-foreground mt-1.5 flex items-start gap-1.5 text-xs">
												<CircleAlert className="mt-px size-3 shrink-0" />
												<span>
													Customers are told to pay by transfer with nowhere to send it. Add
													an account under Manage.
												</span>
											</p>
										)}
									</div>

									<div className="flex shrink-0 items-center gap-3">
										<Switch
											checked={method.isActive}
											aria-label={t("offerThingAtCheckout", { name: method.title })}
											disabled={busy === method.id}
											onCheckedChange={(checked) =>
												run(
													method.id,
													() =>
														updateMethod({
															id: method.id,
															data: { isActive: checked },
														}).unwrap(),
													checked
										? t("switchedOnThing", { name: method.title })
										: t("switchedOffThing", { name: method.title })
												)
											}
										/>

										<Button asChild variant="outline" size="sm">
											<Link href={`/admin/dashboard/payments/methods/${method.id}`}>
												<Settings2 />{t("manage")}</Link>
										</Button>

										{/* Only a leftover from the old builder can be removed. The
										    three standard kinds are switched off, not deleted —
										    deleting one would only bring it back on the next read. */}
										{!method.isBuiltIn && (
											<Button
												variant="ghost"
												size="icon"
												aria-label={t("deleteThing", { thing: method.title })}
												disabled={busy === method.id}
												onClick={() =>
													run(
														method.id,
														() => removeMethod(method.id).unwrap(),
														`“${method.title}” deleted.`
													)
												}
											>
												<Trash2 className="text-muted-foreground" />
											</Button>
										)}
									</div>
								</li>
							)
						})}
					</ul>
				</Panel>
			)}
		</div>
	)
}
