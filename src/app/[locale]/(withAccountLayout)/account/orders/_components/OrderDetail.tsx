"use client"

import { useLocale, useTranslations } from "next-intl"
import { Download, Loader2 } from "lucide-react"
import { Link } from "@/i18n/navigation"
import { useMyOrderQuery } from "@/redux/api/storefrontApi"
import { countryName } from "@/lib/countries"
import { formatDate } from "@/lib/dates"
import { formatMoney } from "@/lib/money"
import BankAccountDetails from "@/app/[locale]/_components/BankAccountDetails"
import type { CheckoutAddress } from "@/types/storefront"
import StatusChip from "../../../_components/StatusChip"

const AddressBlock = ({ address, locale }: { address: CheckoutAddress; locale: string }) => (
	<address className="text-muted-foreground text-sm not-italic">
		{address.firstName} {address.lastName}
		{address.company && (
			<>
				<br />
				{address.company}
			</>
		)}
		<br />
		{address.street1}
		{address.street2 && (
			<>
				<br />
				{address.street2}
			</>
		)}
		<br />
		{address.postcode} {address.city}
		<br />
		{countryName(address.countryCode, locale)}
	</address>
)

export const OrderDetail = ({ id }: { id: string }) => {
	const t = useTranslations("account")
	const locale = useLocale()
	const { data: order, isLoading, isError } = useMyOrderQuery(id)

	const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1"

	if (isLoading) {
		return (
			<p className="text-muted-foreground py-16 text-center text-sm">
				<Loader2 className="mr-2 inline size-4 animate-spin" />…
			</p>
		)
	}

	if (isError || !order) {
		return (
			<div className="py-16 text-center">
				<p className="text-muted-foreground text-sm">{t("noOrders")}</p>
				<Link
					href="/account/orders"
					className="text-primary mt-4 inline-block underline underline-offset-2"
				>
					{t("ordersTitle")}
				</Link>
			</div>
		)
	}

	return (
		<div className="space-y-10">
			<div className="flex flex-wrap items-center gap-4">
				<h2 className="font-heading text-2xl font-extrabold tracking-tight">
					{order.orderNumber}
				</h2>
				<StatusChip status={order.status} kind="orderStatus" />
				<StatusChip status={order.paymentStatus} kind="paymentStatus" />
				<span className="text-muted-foreground text-sm">
					{formatDate(order.placedAt, locale)}
				</span>

				{/* Plain anchor, not next/link: this streams a PDF rather than
				    navigating to a page. */}
				<a
					href={`${apiBase}/orders/${order.id}/invoice.pdf`}
					className="text-primary ml-auto inline-flex items-center gap-2 text-sm underline underline-offset-2"
				>
					<Download className="size-4" />
					{t("downloadInvoice")}
				</a>
			</div>

			<section>
				<h3 className="font-heading mb-4 text-lg font-semibold">{t("orderItems")}</h3>
				<ul className="divide-y border-y">
					{order.items.map((item) => (
						<li key={item.id} className="flex gap-4 py-4">
							<div className="min-w-0 flex-1">
								<p className="font-medium">{item.name}</p>
								{item.sku && <p className="text-muted-foreground text-xs">{item.sku}</p>}
								<p className="text-muted-foreground mt-1 text-sm">
									{item.quantity} × {formatMoney(item.unitPrice, locale)}
								</p>
								{item.options?.map((option) => (
									<p key={option.id} className="text-muted-foreground mt-1 text-xs">
										+ {option.name} ({option.quantity} × {formatMoney(option.unitPrice, locale)})
									</p>
								))}
							</div>
							<span className="shrink-0 font-semibold">{formatMoney(item.lineTotal, locale)}</span>
						</li>
					))}
				</ul>

				<dl className="mt-6 ml-auto max-w-xs space-y-2 text-sm">
					<div className="flex justify-between gap-4">
						<dt className="text-muted-foreground">{t("subtotal")}</dt>
						<dd>{formatMoney(order.subtotal, locale)}</dd>
					</div>
					<div className="flex justify-between gap-4">
						<dt className="text-muted-foreground">{t("shipping")}</dt>
						<dd>{formatMoney(order.shippingTotal, locale)}</dd>
					</div>
					{order.taxLines.map((line, index) => (
						<div key={index} className="flex justify-between gap-4">
							<dt className="text-muted-foreground">
								{t("tax")} ({line.ratePercent}%)
							</dt>
							<dd>{formatMoney(line.amount, locale)}</dd>
						</div>
					))}
					<div className="flex justify-between gap-4 border-t pt-2">
						<dt className="font-heading font-semibold">{t("grandTotal")}</dt>
						<dd className="text-lg font-bold">{formatMoney(order.grandTotal, locale)}</dd>
					</div>
				</dl>

				{order.reverseCharged && (
					<p className="text-muted-foreground mt-3 text-right text-xs">{t("reverseCharged")}</p>
				)}
			</section>

			<div className="grid gap-8 sm:grid-cols-2">
				<section>
					<h3 className="font-heading mb-2 text-base font-semibold">{t("shippingAddress")}</h3>
					<AddressBlock address={order.addresses.shipping} locale={locale} />

					{order.shippingMethod && (
						<>
							<h3 className="font-heading mt-6 mb-1 text-base font-semibold">
								{t("deliveryMethod")}
							</h3>
							<p className="text-muted-foreground text-sm">{order.shippingMethod.title}</p>
						</>
					)}
				</section>

				<section>
					<h3 className="font-heading mb-2 text-base font-semibold">{t("billingAddress")}</h3>
					<AddressBlock address={order.addresses.billing} locale={locale} />

					{order.paymentMethod && (
						<>
							<h3 className="font-heading mt-6 mb-1 text-base font-semibold">
								{t("paymentMethod")}
							</h3>
							<p className="text-muted-foreground text-sm">{order.paymentMethod.title}</p>
							{order.paymentMethod.instructions && (
								<>
									<h4 className="font-heading mt-4 mb-1 text-sm font-semibold">
										{t("paymentInstructions")}
									</h4>
									<p className="text-muted-foreground text-sm leading-relaxed">
										{order.paymentMethod.instructions}
									</p>
								</>
							)}

							{/* Repeated here, not only on the thank-you page: an unpaid
							    transfer is exactly what somebody comes back to their order
							    history to look up. */}
							{!!order.paymentMethod.bankAccounts?.length && (
								<BankAccountDetails accounts={order.paymentMethod.bankAccounts} />
							)}
						</>
					)}
				</section>
			</div>

			{order.customerNote && (
				<section>
					<h3 className="font-heading mb-2 text-base font-semibold">{t("customerNote")}</h3>
					<p className="text-muted-foreground text-sm leading-relaxed">{order.customerNote}</p>
				</section>
			)}
		</div>
	)
}

export default OrderDetail
