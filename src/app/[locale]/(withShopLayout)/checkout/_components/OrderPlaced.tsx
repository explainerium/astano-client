"use client"

import { useLocale, useTranslations } from "next-intl"
import { CheckCircle2 } from "lucide-react"
import { Link } from "@/i18n/navigation"
import useMoney from "@/lib/useMoney"
import { countryName } from "@/lib/countries"
import BankAccountDetails from "@/app/[locale]/_components/BankAccountDetails"
import type { PlacedOrder } from "@/types/storefront"

/** Order confirmation — the last thing the customer sees before their inbox. */
export const OrderPlaced = ({ order }: { order: PlacedOrder }) => {
	// The shop's own separators and symbol. A function rather than an import,
	// so React Compiler can see that these prices depend on it.
	const formatMoney = useMoney()

	const t = useTranslations("checkout")
	const locale = useLocale()

	const address = order.addresses.shipping

	return (
		<div className="mx-auto w-full max-w-[720px] px-6 py-20">
			<div className="text-center">
				<CheckCircle2 className="text-primary mx-auto size-10" />
				<h1 className="font-heading mt-6 text-2xl font-extrabold tracking-tight sm:text-3xl">
					{t("orderPlaced")}
				</h1>
				<p className="text-muted-foreground mt-3 text-sm">{t("confirmationNote")}</p>
			</div>

			<dl className="mt-10 space-y-3 border-y py-6 text-sm">
				<div className="flex justify-between gap-4">
					<dt className="text-muted-foreground">{t("orderNumber")}</dt>
					<dd className="font-semibold">{order.orderNumber}</dd>
				</div>
				<div className="flex justify-between gap-4">
					<dt className="text-muted-foreground">{t("subtotal")}</dt>
					<dd>{formatMoney(order.subtotal)}</dd>
				</div>
				<div className="flex justify-between gap-4">
					<dt className="text-muted-foreground">{t("shipping")}</dt>
					<dd>{formatMoney(order.shippingTotal)}</dd>
				</div>
				{order.taxLines.map((line, index) => (
					<div key={index} className="flex justify-between gap-4">
						<dt className="text-muted-foreground">
							{t("tax")} ({line.ratePercent}%)
						</dt>
						<dd>{formatMoney(line.amount)}</dd>
					</div>
				))}
				<div className="flex justify-between gap-4 border-t pt-3">
					<dt className="font-heading font-semibold">{t("grandTotal")}</dt>
					<dd className="text-lg font-bold">{formatMoney(order.grandTotal)}</dd>
				</div>
			</dl>

			{order.reverseCharged && (
				<p className="text-muted-foreground mt-4 text-xs leading-relaxed">{t("reverseCharged")}</p>
			)}

			<div className="mt-8 grid gap-8 sm:grid-cols-2">
				<div>
					<h2 className="font-heading mb-2 text-base font-semibold">{t("shippingAddress")}</h2>
					<address className="text-muted-foreground text-sm not-italic">
						{address.firstName} {address.lastName}
						{address.company && <><br />{address.company}</>}
						<br />
						{address.street1}
						{address.street2 && <><br />{address.street2}</>}
						<br />
						{address.postcode} {address.city}
						<br />
						{countryName(address.countryCode, locale)}
					</address>
				</div>

				<div>
					<h2 className="font-heading mb-2 text-base font-semibold">{t("payment")}</h2>
					<p className="text-muted-foreground text-sm">{order.paymentMethod?.title}</p>
					{order.paymentMethod?.instructions && (
						<>
							<h3 className="font-heading mt-4 mb-1 text-sm font-semibold">
								{t("paymentInstructions")}
							</h3>
							<p className="text-muted-foreground text-sm leading-relaxed">
								{order.paymentMethod.instructions}
							</p>
						</>
					)}

					{/* The details themselves, as rows with a copy button. This is the
					    part of a bank-transfer order that has a job to do. */}
					{!!order.paymentMethod?.bankAccounts?.length && (
						<BankAccountDetails accounts={order.paymentMethod.bankAccounts} />
					)}
					{order.shippingMethod && (
						<>
							<h3 className="font-heading mt-4 mb-1 text-sm font-semibold">{t("delivery")}</h3>
							<p className="text-muted-foreground text-sm">{order.shippingMethod.title}</p>
						</>
					)}
				</div>
			</div>

			<div className="mt-10 flex flex-wrap gap-4">
				<Link
					href="/account/orders"
					className="bg-primary text-primary-foreground px-7 py-3 text-sm font-semibold tracking-wide uppercase transition-opacity hover:opacity-90"
				>
					{t("viewOrders")}
				</Link>
				<Link
					href="/products"
					className="border px-7 py-3 text-sm font-semibold tracking-wide uppercase transition-colors hover:border-neutral-400"
				>
					{t("keepShopping")}
				</Link>
			</div>
		</div>
	)
}

export default OrderPlaced
