"use client"

import { useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { AlertCircle, Loader2 } from "lucide-react"
import { useRouter } from "@/i18n/navigation"
import { Link } from "@/i18n/navigation"
import {
	useAcceptQuoteMutation,
	useAvailablePaymentMethodsQuery,
	useMyAddressesQuery,
} from "@/redux/api/storefrontApi"
import { countryName } from "@/lib/countries"
import { formatMoney } from "@/lib/money"
import { cn } from "@/lib/utils"
import type { CheckoutAddress, SavedAddress } from "@/types/storefront"

const apiMessage = (error: unknown) => (error as { data?: { message?: string } })?.data?.message

/** Strips the address-book extras the order endpoint does not take. */
const toCheckoutAddress = (address: SavedAddress): CheckoutAddress => ({
	firstName: address.firstName,
	lastName: address.lastName,
	company: address.company || undefined,
	street1: address.street1,
	street2: address.street2 || undefined,
	city: address.city,
	state: address.state || undefined,
	postcode: address.postcode,
	countryCode: address.countryCode,
	phone: address.phone || undefined,
	email: address.email || undefined,
})

/**
 * Turning an answered quote into an order.
 *
 * Deliberately not a second checkout: the prices are already agreed, so all
 * that is missing is where it goes and how it is paid. Both come from what the
 * customer already has — their address book and the methods they are eligible
 * for at this total.
 *
 * The order is written at the **quoted** prices, not today's catalogue prices.
 * That is the server's doing, and the note says so, because a customer who
 * accepts a two-week-old offer needs to know which figure binds.
 */
export const AcceptQuote = ({ quoteId, total }: { quoteId: string; total: string }) => {
	const t = useTranslations("account")
	const locale = useLocale()
	const router = useRouter()

	const { data: addresses = [] } = useMyAddressesQuery()
	const [addressId, setAddressId] = useState<string | null>(null)
	const [paymentMethodId, setPaymentMethodId] = useState<string | null>(null)
	const [error, setError] = useState<string | null>(null)

	const [acceptQuote, { isLoading }] = useAcceptQuoteMutation()

	const chosen = addresses.find((a) => a.id === addressId) ?? addresses.find((a) => a.isDefaultShipping) ?? addresses[0]

	const { data: methods = [] } = useAvailablePaymentMethodsQuery(
		{ orderTotal: Number(total) || 0, countryCode: chosen?.countryCode ?? "DE" },
		{ skip: !chosen }
	)

	const eligible = methods.filter((method) => method.eligible)
	const selectedPayment =
		paymentMethodId ?? (eligible.length === 1 ? eligible[0].id : null)

	if (!addresses.length) {
		return (
			<p className="border-destructive/40 bg-destructive/5 text-destructive flex items-center gap-2 border p-4 text-sm">
				<AlertCircle className="size-4 shrink-0" />
				{t("acceptNeedsAddress")}
				<Link href="/account/addresses" className="underline underline-offset-2">
					{t("addAddress")}
				</Link>
			</p>
		)
	}

	const submit = async () => {
		if (!chosen || !selectedPayment) return
		setError(null)
		try {
			const order = await acceptQuote({
				id: quoteId,
				billingAddress: toCheckoutAddress(chosen),
				paymentMethodId: selectedPayment,
			}).unwrap()
			router.push({ pathname: "/account/orders/[id]", params: { id: order.id } })
		} catch (caught) {
			setError(apiMessage(caught) ?? t("acceptFailed"))
		}
	}

	return (
		<div className="bg-muted/50 space-y-5 p-6">
			<p className="text-muted-foreground text-sm leading-relaxed">{t("acceptNote")}</p>

			<div>
				<h4 className="font-heading mb-2 text-sm font-semibold">{t("acceptAddress")}</h4>
				<ul className="space-y-2">
					{addresses.map((address) => (
						<li key={address.id}>
							<label
								className={cn(
									"flex cursor-pointer items-start gap-3 border bg-white p-3 text-sm transition-colors",
									chosen?.id === address.id ? "border-primary" : "hover:border-neutral-400"
								)}
							>
								<input
									type="radio"
									name="accept-address"
									checked={chosen?.id === address.id}
									onChange={() => setAddressId(address.id)}
									className="mt-0.5 size-4 shrink-0"
								/>
								<span>
									{address.label && (
										<span className="text-muted-foreground block text-xs uppercase">
											{address.label}
										</span>
									)}
									{address.firstName} {address.lastName}
									{address.company ? `, ${address.company}` : ""} — {address.street1},{" "}
									{address.postcode} {address.city}, {countryName(address.countryCode, locale)}
								</span>
							</label>
						</li>
					))}
				</ul>
			</div>

			<div>
				<h4 className="font-heading mb-2 text-sm font-semibold">{t("acceptPayment")}</h4>
				<ul className="space-y-2">
					{methods.map((method) => (
						<li key={method.id}>
							<label
								className={cn(
									"flex cursor-pointer items-start gap-3 border bg-white p-3 text-sm transition-colors",
									!method.eligible
										? "cursor-not-allowed opacity-60"
										: selectedPayment === method.id
											? "border-primary"
											: "hover:border-neutral-400"
								)}
							>
								<input
									type="radio"
									name="accept-payment"
									disabled={!method.eligible}
									checked={selectedPayment === method.id}
									onChange={() => setPaymentMethodId(method.id)}
									className="mt-0.5 size-4 shrink-0"
								/>
								<span>{method.title ?? method.code}</span>
							</label>
						</li>
					))}
				</ul>
			</div>

			{error && (
				<p className="text-destructive flex items-start gap-2 text-sm" role="alert">
					<AlertCircle className="mt-0.5 size-4 shrink-0" />
					{error}
				</p>
			)}

			<button
				type="button"
				onClick={submit}
				disabled={isLoading || !chosen || !selectedPayment}
				className="bg-primary text-primary-foreground inline-flex items-center justify-center gap-2 px-7 py-3.5 text-sm font-semibold tracking-wide uppercase transition-opacity hover:opacity-90 disabled:opacity-50"
			>
				{isLoading && <Loader2 className="size-4 animate-spin" />}
				{isLoading ? t("accepting") : `${t("acceptQuote")} — ${formatMoney(total) ?? ""}`}
			</button>
		</div>
	)
}

export default AcceptQuote
