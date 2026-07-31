import {
	Building2,
	CreditCard,
	FolderTree,
	Image as ImageIcon,
	LayoutGrid,
	Mail,
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
		{ label: "Customers", href: "/admin/dashboard/users", icon: Users, nested: true },
		{ label: "Dealers", href: "/admin/dashboard/b2b", icon: Building2, nested: true },
		{ label: "Contact", href: "/admin/dashboard/contact", icon: Mail, nested: true },
		{ label: "Newsletter", href: "/admin/dashboard/newsletter", icon: Send, nested: true },
	],
	[
		{ label: "Tax", href: "/admin/dashboard/tax", icon: Percent, nested: true },
		{ label: "Shipping", href: "/admin/dashboard/shipping", icon: Truck, nested: true },
		{
			label: "Payment methods",
			href: "/admin/dashboard/payment-methods",
			icon: CreditCard,
			nested: true,
		},
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
