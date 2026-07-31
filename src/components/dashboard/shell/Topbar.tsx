"use client"

import { usePathname } from "next/navigation"
import { Bell, MessageSquare, Search } from "lucide-react"
import { findNavItem } from "./navItems"
import UserMenu from "./UserMenu"

/**
 * The heading is derived from the active nav item rather than passed down, so a
 * page can never disagree with the sidebar about what it is called.
 */
export const Topbar = () => {
	const pathname = usePathname()
	const title = findNavItem(pathname)?.label ?? "Dashboard"

	return (
		<header className="flex h-20 shrink-0 items-center gap-4 px-6 lg:px-8">
			<h1 className="font-heading truncate text-2xl font-semibold tracking-tight">{title}</h1>

			<div className="ml-auto flex items-center gap-2 lg:gap-4">
				<label className="bg-muted/70 border-input hidden items-center gap-2 rounded-lg border px-4 py-2.5 md:flex">
					<span className="sr-only">Search</span>
					<input
						type="search"
						placeholder="Search stock, order, etc"
						className="placeholder:text-muted-foreground w-48 bg-transparent text-sm outline-none lg:w-64"
					/>
					<Search className="text-muted-foreground size-4 shrink-0" />
				</label>

				<button
					type="button"
					aria-label="Messages"
					className="hover:bg-muted text-muted-foreground hidden size-10 items-center justify-center rounded-lg transition-colors sm:flex"
				>
					<MessageSquare className="size-5" strokeWidth={1.75} />
				</button>

				<button
					type="button"
					aria-label="Notifications"
					className="hover:bg-muted text-muted-foreground relative hidden size-10 items-center justify-center rounded-lg transition-colors sm:flex"
				>
					<Bell className="size-5" strokeWidth={1.75} />
					<span className="bg-negative absolute top-2 right-2.5 size-2 rounded-full" />
				</button>

				<UserMenu />
			</div>
		</header>
	)
}

export default Topbar
