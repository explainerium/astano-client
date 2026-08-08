"use client"

import { useState } from "react"
import Link from "next/link"
import { FileText, Package, ShoppingCart, Wallet } from "lucide-react"
import {
	Area,
	AreaChart,
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts"
import Panel from "@/components/dashboard/shell/Panel"
import StatCard from "@/components/dashboard/shell/StatCard"
import { Badge } from "@/components/ui/badge"
import { useDashboardSummaryQuery, type DashboardSummary } from "@/redux/api/dashboardApi"
import { cn } from "@/lib/utils"

const money = new Intl.NumberFormat("de-DE", {
	style: "currency",
	currency: "EUR",
	maximumFractionDigits: 0,
})

const moneyExact = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" })
const shortDate = new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "short" })

/** Windows the screen offers. Anything longer stops being "what is happening now". */
const RANGES = [
	{ days: 7, label: "7 days" },
	{ days: 30, label: "30 days" },
	{ days: 90, label: "90 days" },
]

/**
 * Categorical fills, defined once in globals.css under .admin-theme so the
 * whole dashboard repaints from one place.
 */
const CATEGORICAL = [
	"var(--color-chart-1)",
	"var(--color-chart-2)",
	"var(--color-chart-3)",
	"var(--color-chart-4)",
	"var(--color-chart-5)",
]

/**
 * Status colours are semantic, not categorical: a cancelled order is red
 * because it is bad news, not because it came fourth in a list.
 */
const STATUS_FILL: Record<string, string> = {
	COMPLETED: "var(--color-positive)",
	PROCESSING: "var(--color-chart-2)",
	PENDING: "var(--color-chart-1)",
	ON_HOLD: "var(--color-chart-5)",
	CANCELLED: "var(--color-negative)",
	FAILED: "var(--color-negative)",
	REFUNDED: "var(--color-chart-3)",
}

const STATUS_TONE: Record<string, string> = {
	COMPLETED: "bg-positive-soft text-positive",
	PROCESSING: "bg-accent-soft text-accent-foreground",
	PENDING: "bg-muted text-muted-foreground",
	ON_HOLD: "bg-muted text-muted-foreground",
	CANCELLED: "bg-negative-soft text-negative",
	FAILED: "bg-negative-soft text-negative",
	REFUNDED: "bg-negative-soft text-negative",
}

/** Roles in the shop's own words. "RESELLER" is a database value, not a label. */
const CUSTOMER_LABEL: Record<string, string> = {
	GUEST: "Guest",
	B2C: "Retail",
	RESELLER: "Dealer",
	SHOP_MANAGER: "Staff",
	ADMIN: "Staff",
}

const titleCase = (value: string) =>
	value.charAt(0) + value.slice(1).toLowerCase().replace(/_/g, " ")

/** Shared tooltip chrome, so every chart on the page looks like the same product. */
const TOOLTIP_STYLE = {
	borderRadius: 5,
	border: "1px solid var(--color-border)",
	background: "var(--color-card)",
	fontSize: 12,
}

const AXIS_TICK = { fontSize: 11, fill: "var(--color-muted-foreground)" }

/**
 * Charts are drawn, not performed.
 *
 * Recharts' entrance animation is on by default and it does not survive this
 * stack — it grows the mark out of a clip rect that never finishes expanding,
 * so an area arrives as a 20px sliver and a pie as no sector at all. Even
 * working it would be wrong here: every range change would replay it, and a
 * figure that has to finish moving before it can be read is a figure that
 * slows the reader down.
 */
const NO_ANIMATION = { isAnimationActive: false } as const

const Placeholder = ({ className, children }: { className?: string; children: React.ReactNode }) => (
	<div
		className={cn(
			"text-muted-foreground flex items-center justify-center rounded-lg border border-dashed text-center text-sm",
			className ?? "h-56"
		)}
	>
		<p className="max-w-[28ch]">{children}</p>
	</div>
)

const Skeleton = ({ className }: { className?: string }) => (
	<div className={cn("bg-muted animate-pulse rounded", className)} />
)

/**
 * A delta the StatCard can draw, or nothing.
 *
 * `deltaPercent` is null when the previous window was empty — there is no
 * percentage change from zero, and inventing "+100%" would be a lie the first
 * week the shop is live.
 */
const deltaOf = (deltaPercent: number | null) =>
	deltaPercent === null
		? undefined
		: {
				value: `${deltaPercent > 0 ? "+" : ""}${deltaPercent.toFixed(2)}%`,
				direction: deltaPercent < 0 ? ("down" as const) : ("up" as const),
			}

// ─── Charts ─────────────────────────────────────────────────────────────────

const RevenueChart = ({ series }: { series: DashboardSummary["series"] }) => {
	const points = series.map((point) => ({
		label: shortDate.format(new Date(point.date)),
		revenue: Number(point.revenue),
	}))

	// Every day is in the series, so an all-zero chart is a real answer — but a
	// flat line along the axis reads as "broken", so say it in words instead.
	if (!points.some((point) => point.revenue > 0)) {
		return <Placeholder>No revenue in this period yet.</Placeholder>
	}

	return (
		<div className="h-56">
			<ResponsiveContainer width="100%" height="100%">
				<AreaChart data={points} margin={{ top: 4, right: 4, bottom: 0, left: -12 }}>
					<defs>
						<linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
							<stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.3} />
							<stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
						</linearGradient>
					</defs>
					<CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
					<XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={24} tick={AXIS_TICK} />
					<YAxis
						tickLine={false}
						axisLine={false}
						width={64}
						tickFormatter={(value: number) => money.format(value)}
						tick={AXIS_TICK}
					/>
					<Tooltip
						cursor={{ stroke: "var(--color-border)" }}
						contentStyle={TOOLTIP_STYLE}
						formatter={(value) => [moneyExact.format(Number(value)), "Revenue"]}
					/>
					<Area
						{...NO_ANIMATION}
						type="monotone"
						dataKey="revenue"
						stroke="var(--color-chart-1)"
						strokeWidth={2}
						fill="url(#revenueFill)"
					/>
				</AreaChart>
			</ResponsiveContainer>
		</div>
	)
}

/**
 * Orders and quote requests side by side.
 *
 * Counts, not money, so the two bars are directly comparable — which is the
 * whole question for a shop that takes both. A week of quotes with no orders
 * behind them means the quote queue is not being worked.
 */
const ActivityChart = ({ series }: { series: DashboardSummary["series"] }) => {
	const points = series.map((point) => ({
		label: shortDate.format(new Date(point.date)),
		orders: point.orders,
		quotes: point.quotes,
	}))

	if (!points.some((point) => point.orders > 0 || point.quotes > 0)) {
		return <Placeholder>No orders or quote requests in this period.</Placeholder>
	}

	return (
		<div className="h-52">
			<ResponsiveContainer width="100%" height="100%">
				<BarChart data={points} margin={{ top: 4, right: 4, bottom: 0, left: -20 }} barGap={2}>
					<CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
					<XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={24} tick={AXIS_TICK} />
					{/* Whole numbers only — half an order does not exist. */}
					<YAxis tickLine={false} axisLine={false} width={44} allowDecimals={false} tick={AXIS_TICK} />
					<Tooltip
						cursor={{ fill: "var(--color-muted)" }}
						contentStyle={TOOLTIP_STYLE}
						formatter={(value, name) => [value, name === "orders" ? "Orders" : "Quotes"]}
					/>
					<Bar {...NO_ANIMATION} dataKey="orders" fill="var(--color-chart-1)" radius={[3, 3, 0, 0]} />
					<Bar {...NO_ANIMATION} dataKey="quotes" fill="var(--color-chart-2)" radius={[3, 3, 0, 0]} />
				</BarChart>
			</ResponsiveContainer>
		</div>
	)
}

/**
 * A donut with its own legend rather than recharts'.
 *
 * The built-in legend cannot show the value beside the label, and a slice
 * without its number is a colour the reader has to guess at.
 */
const DonutChart = ({
	slices,
	total,
	unit,
}: {
	slices: { key: string; label: string; value: number; fill: string; caption: string }[]
	total: string
	unit: string
}) => (
	<div className="flex flex-col gap-4">
		<div className="relative h-40">
			<ResponsiveContainer width="100%" height="100%">
				<PieChart>
					<Pie
						{...NO_ANIMATION}
						data={slices}
						dataKey="value"
						nameKey="label"
						innerRadius={52}
						outerRadius={76}
						paddingAngle={slices.length > 1 ? 2 : 0}
						strokeWidth={0}
					>
						{slices.map((slice) => (
							<Cell key={slice.key} fill={slice.fill} />
						))}
					</Pie>
					<Tooltip contentStyle={TOOLTIP_STYLE} />
				</PieChart>
			</ResponsiveContainer>

			{/* The total belongs in the hole — it is the one number the ring is a
			    breakdown of, and putting it anywhere else makes it look separate. */}
			<div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
				<p className="font-heading text-lg leading-none font-semibold tracking-tight">{total}</p>
				<p className="text-muted-foreground mt-1 text-[11px]">{unit}</p>
			</div>
		</div>

		<ul className="space-y-1.5">
			{slices.map((slice) => (
				<li key={slice.key} className="flex items-center gap-2 text-sm">
					<span
						className="size-2.5 shrink-0 rounded-full"
						style={{ background: slice.fill }}
						aria-hidden
					/>
					<span className="min-w-0 flex-1 truncate">{slice.label}</span>
					<span className="text-muted-foreground tabular-nums">{slice.caption}</span>
				</li>
			))}
		</ul>
	</div>
)

/**
 * A ranking, drawn as horizontal bars.
 *
 * Horizontal because the labels are product and category names — rotated
 * vertical labels are unreadable, and truncating them to fit a column loses
 * exactly the part that tells them apart.
 */
const RankingChart = ({
	rows,
}: {
	rows: { id: string; name: string; revenue: string; quantity: number }[]
}) => (
	<div className="h-56">
		<ResponsiveContainer width="100%" height="100%">
			<BarChart
				layout="vertical"
				data={rows.map((row) => ({ ...row, value: Number(row.revenue) }))}
				margin={{ top: 0, right: 8, bottom: 0, left: 0 }}
			>
				<CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
				<XAxis type="number" hide />
				<YAxis
					type="category"
					dataKey="name"
					width={104}
					tickLine={false}
					axisLine={false}
					tick={AXIS_TICK}
				/>
				<Tooltip
					cursor={{ fill: "var(--color-muted)" }}
					contentStyle={TOOLTIP_STYLE}
					formatter={(value) => [moneyExact.format(Number(value)), "Revenue"]}
				/>
				<Bar {...NO_ANIMATION} dataKey="value" radius={[0, 3, 3, 0]} barSize={16}>
					{rows.map((row, index) => (
						<Cell key={row.id} fill={CATEGORICAL[index % CATEGORICAL.length]} />
					))}
				</Bar>
			</BarChart>
		</ResponsiveContainer>
	</div>
)

// ─── Screen ─────────────────────────────────────────────────────────────────

/**
 * The admin landing screen.
 *
 * Everything is one query, so the page either has its figures or says it is
 * loading — it never draws half a dashboard with the other half invented.
 */
export const DashboardOverview = () => {
	const [days, setDays] = useState(7)
	const { data, isLoading, isError, refetch, isFetching } = useDashboardSummaryQuery({ days })

	const caption = `vs previous ${days} days`
	const pending = isLoading || !data

	if (isError) {
		return (
			<Panel>
				<div className="py-16 text-center">
					<p className="text-muted-foreground text-sm">Could not load the dashboard.</p>
					<button
						type="button"
						onClick={() => refetch()}
						className="bg-primary text-primary-foreground mt-4 rounded-md px-5 py-2 text-sm font-medium"
					>
						Try again
					</button>
				</div>
			</Panel>
		)
	}

	const statusSlices =
		data?.ordersByStatus.map((row) => ({
			key: row.status,
			label: titleCase(row.status),
			value: row.count,
			fill: STATUS_FILL[row.status] ?? CATEGORICAL[4],
			caption: String(row.count),
		})) ?? []

	const customerSlices =
		data?.revenueByCustomerType.map((row, index) => ({
			key: row.type,
			label: CUSTOMER_LABEL[row.type] ?? titleCase(row.type),
			value: Number(row.revenue),
			fill: CATEGORICAL[index % CATEGORICAL.length],
			caption: moneyExact.format(Number(row.revenue)),
		})) ?? []

	const totalOrders = statusSlices.reduce((sum, slice) => sum + slice.value, 0)

	return (
		<div className="space-y-5">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<h1 className="font-heading text-xl font-semibold tracking-tight">Overview</h1>
					<p className="text-muted-foreground text-sm">
						Orders, quotes and revenue for the last {days} days.
					</p>
				</div>

				<div className="border-border bg-card flex rounded-lg border p-1">
					{RANGES.map((range) => (
						<button
							key={range.days}
							type="button"
							onClick={() => setDays(range.days)}
							aria-pressed={days === range.days}
							className={cn(
								"rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
								days === range.days
									? "bg-primary text-primary-foreground"
									: "text-muted-foreground hover:text-foreground"
							)}
						>
							{range.label}
						</button>
					))}
				</div>
			</div>

			<div className={cn("grid gap-5 sm:grid-cols-2 xl:grid-cols-4", isFetching && "opacity-70")}>
				{pending ? (
					<>
						<Skeleton className="h-[122px]" />
						<Skeleton className="h-[122px]" />
						<Skeleton className="h-[122px]" />
						<Skeleton className="h-[122px]" />
					</>
				) : (
					<>
						<StatCard
							label="Revenue"
							value={moneyExact.format(Number(data.stats.revenue.value))}
							icon={Wallet}
							delta={deltaOf(data.stats.revenue.deltaPercent)}
							caption={caption}
							highlighted
						/>
						<StatCard
							label="Orders"
							value={String(data.stats.orders.value)}
							icon={ShoppingCart}
							delta={deltaOf(data.stats.orders.deltaPercent)}
							caption={caption}
						/>
						<StatCard
							label="Quote requests"
							value={String(data.stats.quotes.value)}
							icon={FileText}
							delta={deltaOf(data.stats.quotes.deltaPercent)}
							caption={caption}
						/>
						<StatCard
							label="Products"
							value={String(data.stats.products.value)}
							icon={Package}
						/>
					</>
				)}
			</div>

			<div className="grid gap-5 xl:grid-cols-3">
				<Panel title="Revenue analytics" className="xl:col-span-2">
					{pending ? <Skeleton className="h-56" /> : <RevenueChart series={data.series} />}
				</Panel>

				<Panel title="Revenue by customer">
					{pending ? (
						<Skeleton className="h-56" />
					) : !customerSlices.length ? (
						<Placeholder>Nothing sold in this period.</Placeholder>
					) : (
						<DonutChart
							slices={customerSlices}
							total={money.format(Number(data.stats.revenue.value))}
							unit="total"
						/>
					)}
				</Panel>
			</div>

			<div className="grid gap-5 xl:grid-cols-3">
				<Panel title="Orders & quotes" className="xl:col-span-2">
					{pending ? <Skeleton className="h-52" /> : <ActivityChart series={data.series} />}
				</Panel>

				<Panel title="Order status">
					{pending ? (
						<Skeleton className="h-56" />
					) : !statusSlices.length ? (
						<Placeholder>No orders in this period.</Placeholder>
					) : (
						<DonutChart slices={statusSlices} total={String(totalOrders)} unit="orders" />
					)}
				</Panel>
			</div>

			<div className="grid gap-5 xl:grid-cols-3">
				<Panel title="Top products">
					{pending ? (
						<Skeleton className="h-56" />
					) : !data.topProducts.length ? (
						<Placeholder>Nothing sold in this period.</Placeholder>
					) : (
						<RankingChart rows={data.topProducts} />
					)}
				</Panel>

				<Panel title="Top categories">
					{pending ? (
						<Skeleton className="h-56" />
					) : !data.topCategories.length ? (
						<Placeholder>Nothing sold in this period.</Placeholder>
					) : (
						<RankingChart rows={data.topCategories} />
					)}
				</Panel>

				<Panel
					title={
						<span className="flex items-center gap-2">
							<h2 className="font-heading text-base font-semibold">Pending dealers</h2>
							{!!data?.pendingDealerCount && (
								<Badge className="bg-accent-soft text-accent-foreground">
									{data.pendingDealerCount}
								</Badge>
							)}
						</span>
					}
					action={
						<Link href="/admin/dashboard/b2b" className="text-primary text-sm hover:underline">
							Review
						</Link>
					}
				>
					{pending ? (
						<Skeleton className="h-56" />
					) : !data.pendingDealers.length ? (
						<Placeholder>No applications waiting.</Placeholder>
					) : (
						<ul className="divide-y">
							{data.pendingDealers.map((dealer) => (
								<li key={dealer.id} className="py-2.5 first:pt-0 last:pb-0">
									<Link
										href={`/admin/dashboard/b2b/${dealer.id}`}
										className="hover:text-primary block truncate text-sm font-medium"
									>
										{dealer.companyName}
									</Link>
									<p className="text-muted-foreground truncate text-xs">
										{dealer.contact} · {dealer.city}, {dealer.countryCode}
									</p>
								</li>
							))}
						</ul>
					)}
				</Panel>
			</div>

			<Panel
				title="Recent orders"
				action={
					<Link href="/admin/dashboard/orders" className="text-primary text-sm hover:underline">
						View all
					</Link>
				}
			>
				{pending ? (
					<Skeleton className="h-56" />
				) : !data.recentOrders.length ? (
					<Placeholder>No orders yet.</Placeholder>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full text-sm">
							<thead>
								<tr className="text-muted-foreground border-b text-left text-xs">
									<th scope="col" className="py-2 pr-3 font-medium">Order</th>
									<th scope="col" className="py-2 pr-3 font-medium">Customer</th>
									<th scope="col" className="py-2 pr-3 font-medium">Status</th>
									<th scope="col" className="py-2 pl-3 text-right font-medium">Total</th>
								</tr>
							</thead>
							<tbody>
								{data.recentOrders.map((order) => (
									<tr key={order.id} className="border-b last:border-0">
										<td className="py-2.5 pr-3">
											<Link
												href={`/admin/dashboard/orders/${order.id}`}
												className="hover:text-primary font-medium tabular-nums"
											>
												{/* Stored as a plain integer, formatted only for display. */}
												AST-{String(order.number).padStart(6, "0")}
											</Link>
											<p className="text-muted-foreground text-xs">
												{shortDate.format(new Date(order.placedAt))}
											</p>
										</td>
										<td className="text-muted-foreground max-w-[24ch] truncate py-2.5 pr-3">
											{order.customer ?? "—"}
										</td>
										<td className="py-2.5 pr-3">
											<Badge
												className={cn(
													"font-medium",
													STATUS_TONE[order.status] ?? "bg-muted text-muted-foreground"
												)}
											>
												{titleCase(order.status)}
											</Badge>
										</td>
										<td className="py-2.5 pl-3 text-right font-medium tabular-nums">
											{moneyExact.format(Number(order.grandTotal))}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</Panel>
		</div>
	)
}

export default DashboardOverview
