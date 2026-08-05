"use client"

import type { ComponentProps } from "react"
import { useTranslations } from "next-intl"
import { FileText, Heart, LogOut, MapPin, Package, User } from "lucide-react"
import { Link, usePathname, useRouter } from "@/i18n/navigation"
import useUserInfo from "@/hooks/useUserInfo"
import logoutUser from "@/services/actions/logoutUser"
import { cn } from "@/lib/utils"

type Href = ComponentProps<typeof Link>["href"]

const LINKS: { href: Href & string; key: string; icon: typeof User }[] = [
	{ href: "/account", key: "dashboard", icon: User },
	{ href: "/account/orders", key: "orders", icon: Package },
	{ href: "/account/quotes", key: "quotes", icon: FileText },
	{ href: "/account/addresses", key: "addresses", icon: MapPin },
	{ href: "/account/wishlist", key: "wishlist", icon: Heart },
	{ href: "/account/profile", key: "profile", icon: User },
]

/**
 * The account sidebar.
 *
 * A PENDING dealer sees a standing notice: they are signed in but priced as a
 * guest until approval (R5b), and a shop that shows them retail prices without
 * saying why looks broken rather than deliberate.
 */
export const AccountNav = () => {
	const t = useTranslations("account")
	const pathname = usePathname()
	const router = useRouter()
	const { status, role } = useUserInfo()

	return (
		<nav className="space-y-6">
			{role === "RESELLER" && status !== "ACTIVE" && (
				<p className="border-primary/40 bg-primary/5 border p-4 text-sm leading-relaxed">
					{t("pendingApproval")}
				</p>
			)}

			<ul className="divide-y border-y">
				{LINKS.map((link) => {
					const Icon = link.icon
					// Exact match for the overview, prefix for the rest — otherwise
					// /account would light up on every child page.
					const active =
						link.href === "/account" ? pathname === "/account" : pathname.startsWith(link.href)

					return (
						<li key={link.key}>
							<Link
								href={link.href}
								aria-current={active ? "page" : undefined}
								className={cn(
									"hover:text-primary flex items-center gap-3 py-3 text-sm transition-colors",
									active && "text-primary font-semibold"
								)}
							>
								<Icon className="size-4 shrink-0" strokeWidth={1.75} />
								{t(`nav.${link.key}`)}
							</Link>
						</li>
					)
				})}
			</ul>

			<button
				type="button"
				onClick={async () => {
					await logoutUser()
					router.replace("/")
				}}
				className="text-muted-foreground hover:text-destructive flex items-center gap-3 text-sm transition-colors"
			>
				<LogOut className="size-4 shrink-0" strokeWidth={1.75} />
				{t("nav.logout")}
			</button>
		</nav>
	)
}

export default AccountNav
