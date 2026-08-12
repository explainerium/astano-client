import {
	CreditCard,
	FolderTree,
	Image as ImageIcon,
	LayoutGrid,
	Mail,
	MailOpen,
	Package,
	Percent,
	Send,
	Settings,
	ShoppingCart,
	SlidersHorizontal,
	Truck,
	Users,
	FileText,
	type LucideIcon,
} from "lucide-react"

export interface NavItem {
	/**
	 * A key under the adminNav namespace, not a finished string.
	 *
	 * The topbar derives the page heading from whichever item is active, so
	 * holding the English here would have printed an English heading above a
	 * German page. Both consumers translate it instead.
	 */
	label: string
	href: string
	icon: LucideIcon
	/** Match nested routes too — /products/new should still light up Products. */
	nested?: boolean
}

/**
 * The dashboard's navigation, and the only place route titles are declared —
 * the topbar derives the page heading from whichever item is active, so a
 * renamed section never leaves a stale title behind.
 *
 * Grouped the way staff actually work: what sells, who buys, how the shop is
 * configured. Groups are separated by a rule, matching the reference design.
 */
export interface NavGroup {
	/** Absent on the first group — the overview needs no heading above it. A key, as above. */
	title?: string
	items: NavItem[]
}

export const navGroups: NavGroup[] = [
	{
		items: [{ label: "dashboard", href: "/admin/dashboard", icon: LayoutGrid }],
	},
	{
		/*
		 * Everything about selling: what is sold, who bought it, and the three
		 * things that decide what an order costs.
		 *
		 * Tax, Shipping and Payments used to sit down with Settings, filed by
		 * "things you configure once". That is a developer's grouping — the person
		 * running the shop reaches for a shipping rate while looking at an order,
		 * not while tidying the company address.
		 */
		title: "shop",
		items: [
			{ label: "orders", href: "/admin/dashboard/orders", icon: ShoppingCart, nested: true },
			{ label: "quotes", href: "/admin/dashboard/quotes", icon: FileText, nested: true },
			{ label: "products", href: "/admin/dashboard/products", icon: Package, nested: true },
			{ label: "categories", href: "/admin/dashboard/categories", icon: FolderTree, nested: true },
			{
				label: "attributes",
				href: "/admin/dashboard/attributes",
				icon: SlidersHorizontal,
				nested: true,
			},
			{ label: "payments", href: "/admin/dashboard/payments", icon: CreditCard, nested: true },
			{ label: "shipping", href: "/admin/dashboard/shipping", icon: Truck, nested: true },
			{ label: "tax", href: "/admin/dashboard/tax", icon: Percent, nested: true },
		],
	},
	{
		title: "site",
		items: [
			/*
			 * One entry, not two.
			 *
			 * "Customers" and "Dealers" were the same table filtered differently,
			 * and a dealer who also buys at retail existed on both. Role is a column
			 * on the Users screen now.
			 */
			{ label: "users", href: "/admin/dashboard/users", icon: Users, nested: true },
			{ label: "media", href: "/admin/dashboard/media", icon: ImageIcon, nested: true },
			{ label: "contact", href: "/admin/dashboard/contact", icon: Mail, nested: true },
			{ label: "newsletter", href: "/admin/dashboard/newsletter", icon: Send, nested: true },
			/*
			 * Beside Settings rather than inside it. What an email says is edited far
			 * more often than what colour it is, and burying twenty templates behind
			 * a settings tab makes the common job the harder one to find.
			 */
			{ label: "emails", href: "/admin/dashboard/emails", icon: MailOpen, nested: true },
			{ label: "settings", href: "/admin/dashboard/settings", icon: Settings, nested: true },
		],
	},
]

export const allNavItems: NavItem[] = navGroups.flatMap((group) => group.items)

/**
 * The item a path belongs to. Longest href wins, so /products/123/edit resolves
 * to Products rather than to the Dashboard root that also prefixes it.
 */
export const findNavItem = (pathname: string): NavItem | undefined =>
	allNavItems
		.filter((item) =>
			item.nested ? pathname === item.href || pathname.startsWith(`${item.href}/`) : pathname === item.href
		)
		.sort((a, b) => b.href.length - a.href.length)[0]
