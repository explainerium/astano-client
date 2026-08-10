"use client"

import { useLocale, useTranslations } from "next-intl"
import { Loader2 } from "lucide-react"
import { Link } from "@/i18n/navigation"
import { useMyOrdersQuery } from "@/redux/api/storefrontApi"
import { formatDate } from "@/lib/dates"
import useMoney from "@/lib/useMoney"
import StatusChip from "../../../_components/StatusChip"

export const OrdersList = () => {
	// The shop's own separators and symbol. A function rather than an import,
	// so React Compiler can see that these prices depend on it.
	const formatMoney = useMoney()

	const t = useTranslations("account")
	const locale = useLocale()
	const { data: orders = [], isLoading } = useMyOrdersQuery()

	if (isLoading) {
		return (
			<p className="text-muted-foreground py-16 text-center text-sm">
				<Loader2 className="mr-2 inline size-4 animate-spin" />…
			</p>
		)
	}

	if (!orders.length) {
		return (
			<div className="py-16 text-center">
				<p className="text-muted-foreground text-sm">{t("noOrders")}</p>
				<Link
					href="/products"
					className="bg-primary text-primary-foreground mt-6 inline-flex px-7 py-3 text-sm font-semibold tracking-wide uppercase"
				>
					{t("startShopping")}
				</Link>
			</div>
		)
	}

	return (
		<div className="overflow-x-auto">
			<table className="w-full min-w-[640px] border-collapse text-sm">
				<thead>
					<tr className="border-b text-left">
						<th scope="col" className="text-muted-foreground py-3 font-medium">
							{t("orderNumber")}
						</th>
						<th scope="col" className="text-muted-foreground py-3 font-medium">
							{t("orderDate")}
						</th>
						<th scope="col" className="text-muted-foreground py-3 font-medium">
							{t("orderStatus")}
						</th>
						<th scope="col" className="text-muted-foreground py-3 font-medium">
							{t("paymentStatus")}
						</th>
						<th scope="col" className="text-muted-foreground py-3 text-right font-medium">
							{t("orderTotal")}
						</th>
						<th scope="col" className="sr-only">
							{t("viewOrder")}
						</th>
					</tr>
				</thead>
				<tbody className="divide-y">
					{orders.map((order) => (
						<tr key={order.id}>
							<td className="py-4 font-medium">{order.orderNumber}</td>
							<td className="text-muted-foreground py-4">
								{formatDate(order.placedAt, locale)}
							</td>
							<td className="py-4">
								<StatusChip status={order.status} kind="orderStatus" />
							</td>
							<td className="py-4">
								<StatusChip status={order.paymentStatus} kind="paymentStatus" />
							</td>
							<td className="py-4 text-right font-semibold">
								{formatMoney(order.grandTotal)}
							</td>
							<td className="py-4 text-right">
								<Link
									href={{ pathname: "/account/orders/[id]", params: { id: order.id } }}
									className="text-primary underline underline-offset-2"
								>
									{t("viewOrder")}
								</Link>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	)
}

export default OrdersList
