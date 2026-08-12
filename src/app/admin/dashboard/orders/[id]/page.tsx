"use client"

import { useLocale, useTranslations } from "next-intl"
import { Fragment, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, FileText, Loader2, Pencil } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { openInvoice } from "@/lib/downloadInvoice"
import useCountryName from "@/lib/useCountryName"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table"
import { useAdminOrderQuery } from "@/redux/api/orderApi"
import type { Order, OrderAddress } from "@/types/order"
import OrderStatusDialog from "../_components/OrderStatusDialog"
import ArtworkLinks from "@/components/shared/ArtworkLinks"
import OrderNotes from "./_components/OrderNotes"
import {
	formatDate,
	ORDER_STATUS,
	PAYMENT_STATUS,
} from "../_components/orderStatus"
import useMoney from "@/lib/useMoney"
import type { MoneyFormatter } from "@/lib/money"

const AddressBlock = ({ title, address }: { title: string; address?: OrderAddress }) => {
	const t = useTranslations("admin")
	const countryName = useCountryName()

	return (
	<section className="bg-card rounded-lg border">
		<h2 className="font-heading border-b px-4 py-3 text-sm font-semibold">{title}</h2>
		<div className="p-4 text-sm">
			{!address ? (
				<p className="text-muted-foreground text-xs">{t("notRecorded")}</p>
			) : (
				<address className="space-y-0.5 not-italic">
					{address.company && <p className="font-medium">{address.company}</p>}
					<p>{[address.firstName, address.lastName].filter(Boolean).join(" ")}</p>
					{address.street1 && <p>{address.street1}</p>}
					{address.street2 && <p>{address.street2}</p>}
					<p>{[address.postcode, address.city].filter(Boolean).join(" ")}</p>
					{address.state && <p>{address.state}</p>}
					<p>{countryName(address.countryCode)}</p>
					{address.email && (
						<p className="text-muted-foreground pt-1 text-xs">{address.email}</p>
					)}
					{address.phone && <p className="text-muted-foreground text-xs">{address.phone}</p>}
				</address>
			)}
		</div>
	</section>
	)
}

// The formatter is passed in rather than imported: it belongs to the page's
// render, which is what lets React Compiler see these prices depend on it.
const Totals = ({ order, formatMoney }: { order: Order; formatMoney: MoneyFormatter }) => {
	const t = useTranslations("admin")

	return (
	<dl className="space-y-1.5 text-sm">
		<div className="flex justify-between gap-4">
			<dt className="text-muted-foreground">{t("subtotal")}</dt>
			<dd className="tabular-nums">{formatMoney(order.subtotal)}</dd>
		</div>

		<div className="flex justify-between gap-4">
			<dt className="text-muted-foreground">
				{t("shipping")}
				{order.shippingMethod && (
					<span className="ml-1.5 text-xs">({order.shippingMethod.title})</span>
				)}
			</dt>
			<dd className="tabular-nums">{formatMoney(order.shippingTotal)}</dd>
		</div>

		{order.taxLines.map((line, index) => (
			<div key={index} className="flex justify-between gap-4">
				<dt className="text-muted-foreground">
					{line.name} <span className="text-xs">({Number(line.ratePercent)}%)</span>
				</dt>
				<dd className="tabular-nums">{formatMoney(line.amount)}</dd>
			</div>
		))}

		{!order.taxLines.length && (
			<div className="flex justify-between gap-4">
				<dt className="text-muted-foreground">{t("tax")}</dt>
				<dd className="tabular-nums">{formatMoney(order.taxTotal)}</dd>
			</div>
		)}

		{Number(order.discountTotal) > 0 && (
			<div className="flex justify-between gap-4">
				<dt className="text-muted-foreground">{t("discount")}</dt>
				<dd className="tabular-nums">−{formatMoney(order.discountTotal)}</dd>
			</div>
		)}

		<div className="flex justify-between gap-4 border-t pt-2 text-base font-semibold">
			<dt>{t("total")}</dt>
			<dd className="tabular-nums">{formatMoney(order.grandTotal)}</dd>
		</div>

		{order.reverseCharged && (
			<p className="text-muted-foreground pt-2 text-xs">
				Reverse charged — the customer accounts for the VAT. Tax lines are recorded
				at zero so the invoice can say why.
				{order.vatNumber && <> VAT ID {order.vatNumber}.</>}
			</p>
		)}
	</dl>
	)
}

export default function OrderDetailPage() {
	const t = useTranslations("admin")
	const locale = useLocale()
	// The shop's own separators and symbol. A function rather than an import,
	// so React Compiler can see that these prices depend on it.
	const formatMoney = useMoney()

	const router = useRouter()
	const params = useParams<{ id: string }>()
	const { data: order, isLoading, isError, error } = useAdminOrderQuery(params.id)
	const [statusOpen, setStatusOpen] = useState(false)
	const [downloading, setDownloading] = useState(false)

	if (isLoading) {
		return (
			<div className="bg-card text-muted-foreground flex items-center justify-center gap-2 rounded-lg border p-16 text-sm">
				<Loader2 className="size-4 animate-spin" />{t("loadingOrder")}</div>
		)
	}

	if (isError || !order) {
		return (
			<div className="text-destructive bg-card rounded-lg border border-dashed p-16 text-center text-sm">
				{(error as { data?: { message?: string } })?.data?.message ?? t("couldNotLoadTheOrder")}
			</div>
		)
	}

	const chip = ORDER_STATUS[order.status]
	const payment = PAYMENT_STATUS[order.paymentStatus]

	return (
		<div className="space-y-5">
			<div className="bg-background sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b py-3">
				<Button
					type="button"
					variant="ghost"
					size="lg"
					onClick={() => router.push("/admin/dashboard/orders")}
				>
					<ArrowLeft />{t("orders")}</Button>

				<h1 className="font-heading text-sm font-semibold">{order.orderNumber}</h1>
				<Badge variant="outline" className={chip.className}>
					{t(chip.labelKey)}
				</Badge>
				<Badge variant="outline" className={payment.className}>
					{t(payment.labelKey)}
				</Badge>

				<div className="ml-auto flex gap-2">
					{/*
					 * Fetched, not linked. A browser following an href sends cookies and
					 * no Authorization header, so a direct link to the API answered 401
					 * to a signed-in admin — see lib/downloadInvoice.
					 */}
					<Button
						variant="outline"
						size="lg"
						disabled={downloading}
						onClick={async () => {
							setDownloading(true)
							try {
								await openInvoice(
									`/admin/orders/${order.id}/invoice.pdf`,
									`invoice-${order.orderNumber}.pdf`
								)
							} catch (error) {
								toast.error(
									(error as { data?: { message?: string } })?.data?.message ??
										t("couldNotOpenTheInvoice")
								)
							}
							setDownloading(false)
						}}
					>
						{downloading ? <Loader2 className="animate-spin" /> : <FileText />}
						{t("invoice")}
					</Button>
					<Button size="lg" onClick={() => setStatusOpen(true)}>
						<Pencil />{t("updateStatus")}</Button>
				</div>
			</div>

			<div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
				<div className="min-w-0 space-y-5">
					<section className="bg-card overflow-hidden rounded-lg border">
						<h2 className="font-heading border-b px-4 py-3 text-sm font-semibold">{t("items")}</h2>

						<div className="overflow-x-auto">
							<Table>
								<TableHeader className="bg-muted/50">
									<TableRow className="hover:bg-transparent">
										{[t("product"), t("sku"), t("qty"), t("unit"), t("total")].map((head) => (
											<TableHead
												key={head}
												className="text-muted-foreground text-xs font-medium tracking-wide uppercase"
											>
												{head}
											</TableHead>
										))}
									</TableRow>
								</TableHeader>
								<TableBody>
									{order.items.map((item) => (
										// Fragment, because a parent line and its option lines are
										// sibling <tr>s — the key belongs here, not on the first row.
										<Fragment key={item.id}>
											<TableRow>
												<TableCell className="font-medium">
												{item.name}
												{!!item.files.length && (
													<div className="mt-1.5 font-normal">
														<ArtworkLinks
															files={item.files}
															labels={{ download: t("download"), deleted: t("noLongerAvailable") }}
														/>
													</div>
												)}
											</TableCell>
												<TableCell className="text-muted-foreground font-mono text-xs">
													{item.sku}
												</TableCell>
												<TableCell className="tabular-nums">{item.quantity}</TableCell>
												<TableCell className="tabular-nums">
													{formatMoney(item.unitPrice)}
												</TableCell>
												<TableCell className="tabular-nums">
													{formatMoney(item.lineTotal)}
												</TableCell>
											</TableRow>

											{/* Configurator options are their own order lines with their
											    own MOQ, so they are shown indented rather than merged
											    into the parent's price (§4.6). */}
											{item.options.map((option) => (
												<TableRow key={option.id} className="text-muted-foreground">
													<TableCell className="pl-8 text-xs">↳ {option.name}</TableCell>
													<TableCell className="font-mono text-xs">{option.sku}</TableCell>
													<TableCell className="tabular-nums text-xs">
														{option.quantity}
													</TableCell>
													<TableCell className="tabular-nums text-xs">
														{formatMoney(option.unitPrice)}
													</TableCell>
													<TableCell className="tabular-nums text-xs">
														{formatMoney(option.lineTotal)}
													</TableCell>
												</TableRow>
											))}
										</Fragment>
									))}
								</TableBody>
							</Table>
						</div>

						<div className="flex justify-end border-t p-4">
							<div className="w-full max-w-xs">
								<Totals order={order} formatMoney={formatMoney} />
							</div>
						</div>
					</section>

					{!!order.statusHistory?.length && (
						<section className="bg-card rounded-lg border">
							<h2 className="font-heading border-b px-4 py-3 text-sm font-semibold">{t("history")}</h2>
							<ol className="divide-y">
								{order.statusHistory.map((entry, index) => (
									<li key={index} className="px-4 py-2.5 text-sm">
										<div className="flex flex-wrap items-center gap-2">
											{entry.from && (
												<span className="text-muted-foreground text-xs">
													{ORDER_STATUS[entry.from] ? t(ORDER_STATUS[entry.from].labelKey) : entry.from} →
												</span>
											)}
											<span className="font-medium">
												{ORDER_STATUS[entry.to] ? t(ORDER_STATUS[entry.to].labelKey) : entry.to}
											</span>
											<span className="text-muted-foreground ml-auto text-xs">
												{formatDate(entry.at, locale)}
											</span>
										</div>
										{entry.note && (
											<p className="text-muted-foreground mt-1 text-xs">{entry.note}</p>
										)}
									</li>
								))}
							</ol>
						</section>
					)}

					<OrderNotes orderId={order.id} />
				</div>

				<aside className="space-y-5">
					<section className="bg-card rounded-lg border">
						<h2 className="font-heading border-b px-4 py-3 text-sm font-semibold">{t("order")}</h2>
						<dl className="space-y-2 p-4 text-sm">
							<div className="flex justify-between gap-3">
								<dt className="text-muted-foreground">{t("placed")}</dt>
								<dd className="text-right text-xs">{formatDate(order.placedAt)}</dd>
							</div>
							{order.paidAt && (
								<div className="flex justify-between gap-3">
									<dt className="text-muted-foreground">{t("paid")}</dt>
									<dd className="text-right text-xs">{formatDate(order.paidAt)}</dd>
								</div>
							)}
							<div className="flex justify-between gap-3">
								<dt className="text-muted-foreground">{t("payment")}</dt>
								<dd className="text-right text-xs">
									{order.paymentMethod?.title ?? "—"}
								</dd>
							</div>
							<div className="flex justify-between gap-3">
								<dt className="text-muted-foreground">{t("shipping")}</dt>
								<dd className="text-right text-xs">{order.shippingMethod?.title ?? "—"}</dd>
							</div>
							{order.totalWeightKg && (
								<div className="flex justify-between gap-3">
									<dt className="text-muted-foreground">{t("weight")}</dt>
									<dd className="text-right text-xs tabular-nums">
										{Number(order.totalWeightKg)} kg
									</dd>
								</div>
							)}
							<div className="flex justify-between gap-3">
								<dt className="text-muted-foreground">{t("language")}</dt>
								<dd className="text-right text-xs uppercase">{order.locale}</dd>
							</div>
						</dl>
					</section>

					<AddressBlock title={t("billing")} address={order.addresses.billing} />
					<AddressBlock title={t("delivery")} address={order.addresses.shipping} />

					{(order.customerNote || order.internalNote) && (
						<section className="bg-card rounded-lg border">
							<h2 className="font-heading border-b px-4 py-3 text-sm font-semibold">{t("notes")}</h2>
							<div className="space-y-3 p-4 text-sm">
								{order.customerNote && (
									<div>
										<p className="text-muted-foreground text-xs">{t("fromTheCustomer")}</p>
										<p>{order.customerNote}</p>
									</div>
								)}
								{order.internalNote && (
									<div>
										<p className="text-muted-foreground text-xs">{t("internal")}</p>
										<p>{order.internalNote}</p>
									</div>
								)}
							</div>
						</section>
					)}
				</aside>
			</div>

			{statusOpen && (
				<OrderStatusDialog open onOpenChange={setStatusOpen} order={order} />
			)}
		</div>
	)
}
