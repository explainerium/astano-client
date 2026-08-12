"use client"

import Link from "next/link"
// next/navigation, not @/i18n/navigation: the dashboard sits outside [locale]
// and has no translated pathnames to resolve.
import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"
import { findNavItem, navGroups } from "./navItems"

export const Sidebar = () => {
	const t = useTranslations("adminNav")

	const pathname = usePathname()
	const active = findNavItem(pathname)

	return (
		<aside className="bg-card border-border hidden w-60 shrink-0 flex-col border-r lg:flex">
			<Link href="/admin/dashboard" className="flex items-center gap-2.5 px-6 py-6">
				<span className="bg-primary flex size-7 items-center justify-center rounded-lg">
					<span className="grid grid-cols-2 gap-[3px]">
						{Array.from({ length: 4 }, (_, i) => (
							<span key={i} className="bg-primary-foreground size-[5px]" />
						))}
					</span>
				</span>
				<span className="font-heading text-lg font-semibold tracking-tight">astano</span>
			</Link>

			<nav className="flex-1 overflow-y-auto px-3 pb-6">
				{navGroups.map((group, index) => (
					<div
						key={group.title ?? index}
						className={cn(
							"space-y-0.5",
							// A rule between groups, matching the reference design.
							index > 0 && "border-border mt-4 border-t pt-4"
						)}
					>
						{/* A heading, now that the groups are long enough that a rule
						    alone no longer says what they have in common. */}
						{group.title && (
							<p className="text-muted-foreground px-3 pt-1 pb-2 text-[11px] font-medium tracking-wider uppercase">
								{t(group.title)}
							</p>
						)}

						{group.items.map((item) => {
							const isActive = active?.href === item.href
							const Icon = item.icon

							return (
								<Link
									key={item.href}
									href={item.href}
									aria-current={isActive ? "page" : undefined}
									className={cn(
										"flex items-center gap-3 rounded-lg px-3 py-2.5 text-[15px] transition-colors",
										isActive
											? "bg-primary text-primary-foreground font-medium"
											: "text-foreground/80 hover:bg-muted"
									)}
								>
									<Icon
										className={cn(
											"size-[18px] shrink-0",
											!isActive && "text-muted-foreground"
										)}
										strokeWidth={1.75}
									/>
									{t(item.label)}
								</Link>
							)
						})}
					</div>
				))}
			</nav>
		</aside>
	)
}

export default Sidebar
