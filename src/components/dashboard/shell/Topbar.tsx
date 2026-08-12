"use client"

import { usePathname } from "next/navigation"
import { Bell, MessageSquare, Search } from "lucide-react"
import { useTranslations } from "next-intl"
import { findNavItem } from "./navItems"
import LanguageMenu from "./LanguageMenu"
import UserMenu from "./UserMenu"

/**
 * The heading is derived from the active nav item rather than passed down, so a
 * page can never disagree with the sidebar about what it is called.
 */
export const Topbar = () => {
	const t = useTranslations("adminNav")
	const pathname = usePathname()
	// The heading is whichever nav item is active, so it has to be translated
	// here too — otherwise a German sidebar sat under an English page title.
	const title = t(findNavItem(pathname)?.label ?? "dashboard")

	return (
		<header className="flex h-20 shrink-0 items-center gap-4 px-6 lg:px-8">
			<h1 className="font-heading truncate text-2xl font-semibold tracking-tight">{title}</h1>

			<div className="ml-auto flex items-center gap-2 lg:gap-4">
				<label className="bg-muted/70 border-input hidden items-center gap-2 rounded-lg border px-4 py-2.5 md:flex">
					<span className="sr-only">{t("search")}</span>
					<input
						type="search"
						placeholder={t("searchStockOrderEtc")}
						className="placeholder:text-muted-foreground w-48 bg-transparent text-sm outline-none lg:w-64"
					/>
					<Search className="text-muted-foreground size-4 shrink-0" />
				</label>

				<button
					type="button"
					aria-label={t("messages")}
					className="hover:bg-muted text-muted-foreground hidden size-10 items-center justify-center rounded-lg transition-colors sm:flex"
				>
					<MessageSquare className="size-5" strokeWidth={1.75} />
				</button>

				<button
					type="button"
					aria-label={t("notifications")}
					className="hover:bg-muted text-muted-foreground relative hidden size-10 items-center justify-center rounded-lg transition-colors sm:flex"
				>
					<Bell className="size-5" strokeWidth={1.75} />
					<span className="bg-negative absolute top-2 right-2.5 size-2 rounded-full" />
				</button>

				{/* Beside the account menu, because it is the same kind of thing:
				    a preference belonging to whoever is signed in. */}
				<LanguageMenu className="hidden sm:flex" />

				<UserMenu />
			</div>
		</header>
	)
}

export default Topbar
