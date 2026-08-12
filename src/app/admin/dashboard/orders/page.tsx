"use client"

import { useLocale, useTranslations } from "next-intl"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, Loader2 } from "lucide-react"
import Toolbar from "@/components/dashboard/shell/Toolbar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table"
import { useAdminOrdersQuery } from "@/redux/api/orderApi"
import type { OrderStatus } from "@/types/order"
import {
	customerName,
	formatDate,
	orderStatusOptions,
	ORDER_STATUS,
	PAYMENT_STATUS,
} from "./_components/orderStatus"
import useMoney from "@/lib/useMoney"
const ANY = "__any__"
const PER_PAGE = 20

export default function OrdersPage() {
	const t = useTranslations("admin")
	const locale = useLocale()
	// The shop's own separators and symbol. A function rather than an import,
	// so React Compiler can see that these prices depend on it.
	const formatMoney = useMoney()

	const router = useRouter()
	const [search, setSearch] = useState("")
	const [status, setStatus] = useState<OrderStatus | undefined>()
	const [page, setPage] = useState(1)

	const { data, isLoading, isFetching, isError, error } = useAdminOrdersQuery({
		search: search.trim() || undefined,
		status,
		page,
		limit: PER_PAGE,
	})

	const orders = data?.data ?? []
	const meta = data?.meta

	/** Any filter change invalidates the page number — page 4 of a new filter is rarely there. */
	const reset = (fn: () => void) => {
		fn()
		setPage(1)
	}

	return (
		<div className="space-y-4">
			<Toolbar
				searchValue={search}
				onSearchChange={(value) => reset(() => setSearch(value))}
				searchPlaceholder={t("searchOrders")}
				filters={
					<Select
						value={status ?? ANY}
						onValueChange={(value) =>
							reset(() => setStatus(value === ANY ? undefined : (value as OrderStatus)))
						}
					>
						<SelectTrigger className="w-44" aria-label={t("filterByStatus")}>
							<SelectValue placeholder={t("anyStatus")} />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value={ANY}>{t("anyStatus")}</SelectItem>
							{orderStatusOptions(t).map((option) => (
								<SelectItem key={option.value} value={option.value}>
									{option.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				}
			/>

			{isLoading && (
				<div className="bg-card text-muted-foreground flex items-center justify-center gap-2 rounded-lg border p-16 text-sm">
					<Loader2 className="size-4 animate-spin" />{t("loadingOrders")}</div>
			)}

			{isError && (
				<div className="text-destructive bg-card rounded-lg border border-dashed p-16 text-center text-sm">
					{(error as { data?: { message?: string } })?.data?.message ??
						t("couldNotLoadOrders")}
				</div>
			)}

			{data && (
				<div className="bg-card overflow-hidden rounded-lg border">
					<div className="overflow-x-auto">
						<Table>
							<TableHeader className="bg-muted/50">
								<TableRow className="hover:bg-transparent">
									{[t("order"), t("customer"), t("placed"), t("items"), t("total"), t("payment"), t("status")].map(
										(head) => (
											<TableHead
												key={head}
												className="text-muted-foreground text-xs font-medium tracking-wide uppercase"
											>
												{head}
											</TableHead>
										)
									)}
									<TableHead className="w-16 pr-4" />
								</TableRow>
							</TableHeader>

							<TableBody>
								{!orders.length && (
									<TableRow className="hover:bg-transparent">
										<TableCell colSpan={8} className="h-40 text-center">
											<p className="text-muted-foreground text-sm">
												{search || status
													? t("noOrdersMatchTheseFilters")
													: t("noOrdersYet")}
											</p>
										</TableCell>
									</TableRow>
								)}

								{orders.map((order) => {
									const chip = ORDER_STATUS[order.status]
									const payment = PAYMENT_STATUS[order.paymentStatus]
									const itemCount = order.items.reduce((n, i) => n + i.quantity, 0)

									return (
										<TableRow
											key={order.id}
											className="cursor-pointer"
											onClick={() => router.push(`/admin/dashboard/orders/${order.id}`)}
										>
											<TableCell className="font-mono text-xs font-medium">
												{order.orderNumber}
											</TableCell>
											<TableCell>
												<span className="text-sm">{customerName(order)}</span>
												{order.reverseCharged && (
													<span className="text-muted-foreground ml-1.5 text-xs">
														· reverse charge
													</span>
												)}
											</TableCell>
											<TableCell className="text-muted-foreground text-xs">
												{formatDate(order.placedAt, locale)}
											</TableCell>
											<TableCell className="tabular-nums">{itemCount}</TableCell>
											<TableCell className="tabular-nums">
												{formatMoney(order.grandTotal)}
											</TableCell>
											<TableCell>
												<Badge variant="outline" className={payment.className}>
													{t(payment.labelKey)}
												</Badge>
											</TableCell>
											<TableCell>
												<Badge variant="outline" className={chip.className}>
													{t(chip.labelKey)}
												</Badge>
											</TableCell>
											<TableCell className="pr-4">
												<div className="flex justify-end">
													<Button
														variant="ghost"
														size="icon"
														aria-label={t("openThing", { thing: order.orderNumber })}
														onClick={(event) => {
															event.stopPropagation()
															router.push(`/admin/dashboard/orders/${order.id}`)
														}}
													>
														<Eye />
													</Button>
												</div>
											</TableCell>
										</TableRow>
									)
								})}
							</TableBody>
						</Table>
					</div>

					{!!meta && meta.total > 0 && (
						<div className="text-muted-foreground flex flex-wrap items-center gap-3 border-t px-4 py-2.5 text-xs">
							<span>
								{t("paginationOrders", { count: meta.total, page: meta.page, pages: meta.totalPages })}
							</span>
							{isFetching && <Loader2 className="size-3 animate-spin" />}
							<div className="ml-auto flex gap-2">
								<Button
									variant="outline"
									size="sm"
									disabled={meta.page <= 1 || isFetching}
									onClick={() => setPage((p) => Math.max(1, p - 1))}
								>{t("previous")}</Button>
								<Button
									variant="outline"
									size="sm"
									disabled={meta.page >= meta.totalPages || isFetching}
									onClick={() => setPage((p) => p + 1)}
								>{t("next")}</Button>
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	)
}
