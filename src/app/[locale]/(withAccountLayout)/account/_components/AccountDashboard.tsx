"use client"

import { useLocale, useTranslations } from "next-intl"
import { Loader2 } from "lucide-react"
import { Link } from "@/i18n/navigation"
import { useMeQuery, useMyOrdersQuery, useMyQuotesQuery } from "@/redux/api/storefrontApi"
import { formatDate } from "@/lib/dates"
import useMoney from "@/lib/useMoney"
import StatusChip from "../../_components/StatusChip"

const RECENT = 3

/** Overview: who you are, and the last few things that happened. */
export const AccountDashboard = () => {
	// The shop's own separators and symbol. A function rather than an import,
	// so React Compiler can see that these prices depend on it.
	const formatMoney = useMoney()

	const t = useTranslations("account")
	const locale = useLocale()

	const { data: profile, isLoading } = useMeQuery()
	const { data: orders = [] } = useMyOrdersQuery()
	const { data: quotes = [] } = useMyQuotesQuery()

	if (isLoading || !profile) {
		return (
			<p className="text-muted-foreground py-16 text-center text-sm">
				<Loader2 className="mr-2 inline size-4 animate-spin" />…
			</p>
		)
	}

	const name = [profile.firstName, profile.lastName].filter(Boolean).join(" ") || profile.email

	return (
		<div className="space-y-10">
			<div>
				<h2 className="font-heading text-2xl font-extrabold tracking-tight">
					{t("greeting", { name })}
				</h2>
				<p className="text-muted-foreground mt-1 text-sm">
					{t("signedInAs", { email: profile.email })}
				</p>
			</div>

			<section>
				<div className="mb-4 flex items-baseline justify-between gap-4">
					<h3 className="font-heading text-lg font-semibold">{t("recentOrders")}</h3>
					{orders.length > RECENT && (
						<Link
							href="/account/orders"
							className="text-primary text-sm underline underline-offset-2"
						>
							{t("viewAll")}
						</Link>
					)}
				</div>

				{!orders.length ? (
					<p className="text-muted-foreground text-sm">{t("noOrders")}</p>
				) : (
					<ul className="divide-y border-y">
						{orders.slice(0, RECENT).map((order) => (
							<li key={order.id} className="flex flex-wrap items-center gap-4 py-4 text-sm">
								<Link
									href={{ pathname: "/account/orders/[id]", params: { id: order.id } }}
									className="hover:text-primary font-medium transition-colors"
								>
									{order.orderNumber}
								</Link>
								<span className="text-muted-foreground">
									{formatDate(order.placedAt, locale)}
								</span>
								<StatusChip status={order.status} kind="orderStatus" />
								<span className="ml-auto font-semibold">
									{formatMoney(order.grandTotal)}
								</span>
							</li>
						))}
					</ul>
				)}
			</section>

			<section>
				<div className="mb-4 flex items-baseline justify-between gap-4">
					<h3 className="font-heading text-lg font-semibold">{t("recentQuotes")}</h3>
					{quotes.length > RECENT && (
						<Link
							href="/account/quotes"
							className="text-primary text-sm underline underline-offset-2"
						>
							{t("viewAll")}
						</Link>
					)}
				</div>

				{!quotes.length ? (
					<p className="text-muted-foreground text-sm">{t("noQuotes")}</p>
				) : (
					<ul className="divide-y border-y">
						{quotes.slice(0, RECENT).map((quote) => (
							<li key={quote.id} className="flex flex-wrap items-center gap-4 py-4 text-sm">
								<Link
									href={{ pathname: "/account/quotes/[id]", params: { id: quote.id } }}
									className="hover:text-primary font-medium transition-colors"
								>
									{quote.quoteNumber}
								</Link>
								<span className="min-w-0 truncate">{quote.title}</span>
								<StatusChip status={quote.status} kind="quoteStatus" />
								<span className="text-muted-foreground ml-auto">
									{quote.quotedSubtotal
										? formatMoney(quote.quotedSubtotal)
										: t("awaitingPrice")}
								</span>
							</li>
						))}
					</ul>
				)}
			</section>
		</div>
	)
}

export default AccountDashboard
