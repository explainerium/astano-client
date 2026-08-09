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
export const navGroups: NavItem[][] = [
	[
		{ label: "Dashboard", href: "/admin/dashboard", icon: LayoutGrid },
		{ label: "Orders", href: "/admin/dashboard/orders", icon: ShoppingCart, nested: true },
		{ label: "Quotes", href: "/admin/dashboard/quotes", icon: FileText, nested: true },
	],
	[
		{ label: "Products", href: "/admin/dashboard/products", icon: Package, nested: true },
		{ label: "Categories", href: "/admin/dashboard/categories", icon: FolderTree, nested: true },
		{
			label: "Attributes",
			href: "/admin/dashboard/attributes",
			icon: SlidersHorizontal,
			nested: true,
		},
		{ label: "Media", href: "/admin/dashboard/media", icon: ImageIcon, nested: true },
	],
	[
		/*
		 * One entry, not two.
		 *
		 * "Customers" and "Dealers" were the same table filtered differently, and
		 * a dealer who also buys at retail existed on both. Role is a column on
		 * the Users screen now.
		 */
		{ label: "Users", href: "/admin/dashboard/users", icon: Users, nested: true },
		{ label: "Contact", href: "/admin/dashboard/contact", icon: Mail, nested: true },
		{ label: "Newsletter", href: "/admin/dashboard/newsletter", icon: Send, nested: true },
	],
	[
		{ label: "Tax", href: "/admin/dashboard/tax", icon: Percent, nested: true },
		{ label: "Shipping", href: "/admin/dashboard/shipping", icon: Truck, nested: true },
		/*
		 * One entry. Stripe and "Bank transfer" are both simply ways to be paid;
		 * splitting them by how they are implemented is a distinction only a
		 * developer cares about, and it left whoever runs the shop looking in two
		 * places for one setting.
		 */
		{
			label: "Payments",
			href: "/admin/dashboard/payments",
			icon: CreditCard,
			nested: true,
		},
		/*
		 * Beside Settings rather than inside it. What an email says is edited far
		 * more often than what colour it is, and burying nineteen templates behind
		 * a settings tab makes the common job the harder one to find.
		 */
		{ label: "Emails", href: "/admin/dashboard/emails", icon: MailOpen, nested: true },
		{ label: "Settings", href: "/admin/dashboard/settings", icon: Settings, nested: true },
	],
]

export const allNavItems: NavItem[] = navGroups.flat()

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
