import { FileText, Package, ShoppingCart, Wallet } from "lucide-react"
import Panel from "@/components/dashboard/shell/Panel"
import StatCard from "@/components/dashboard/shell/StatCard"

/**
 * NOT REAL DATA.
 *
 * The API has no analytics endpoints yet — no revenue rollup, no period
 * comparison, no funnel. These values exist so the layout can be reviewed and
 * must be replaced before anyone is shown this screen. The counts are the
 * cheapest to make real: every admin list endpoint already returns meta.total.
 */
const PLACEHOLDER_STATS = [
	{
		label: "Revenue",
		value: "—",
		icon: Wallet,
		delta: { value: "+0.00%", direction: "up" as const },
		caption: "vs last week",
		highlighted: true,
	},
	{
		label: "Orders",
		value: "—",
		icon: ShoppingCart,
		delta: { value: "+0.00%", direction: "up" as const },
		caption: "vs last week",
	},
	{
		label: "Quote requests",
		value: "—",
		icon: FileText,
		delta: { value: "+0.00%", direction: "up" as const },
		caption: "vs last week",
	},
	{
		label: "Products",
		value: "—",
		icon: Package,
	},
]

const Awaiting = ({ what }: { what: string }) => (
	<div className="text-muted-foreground flex h-56 items-center justify-center rounded-xl border border-dashed text-center text-sm">
		<p className="max-w-[22ch]">{what}</p>
	</div>
)

export default function DashboardPage() {
	return (
		<div className="space-y-5">
			<div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
				{PLACEHOLDER_STATS.map((stat) => (
					<StatCard key={stat.label} {...stat} />
				))}
			</div>

			<div className="grid gap-5 xl:grid-cols-3">
				<Panel title="Revenue analytics" className="xl:col-span-2">
					<Awaiting what="Revenue over time appears once the analytics endpoint exists." />
				</Panel>

				<Panel title="Top categories">
					<Awaiting what="Category breakdown needs an order-line rollup." />
				</Panel>
			</div>

			<div className="grid gap-5 xl:grid-cols-3">
				<Panel title="Recent orders" className="xl:col-span-2">
					<Awaiting what="Wired up when the orders screen lands." />
				</Panel>

				<Panel title="Pending dealer applications">
					<Awaiting what="Reads the B2B review queue." />
				</Panel>
			</div>
		</div>
	)
}
