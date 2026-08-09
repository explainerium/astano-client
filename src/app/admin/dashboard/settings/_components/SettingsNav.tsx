"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Loader2 } from "lucide-react"
import { useSettingsQuery } from "@/redux/api/settingApi"
import { cn } from "@/lib/utils"

/**
 * The settings sub-navigation.
 *
 * Built from the API's own group list, like the fields themselves — a group
 * added in settingRegistry.ts appears here with no change on this side.
 *
 * Vertical rather than a top tab strip: there are eight groups and counting,
 * and eight tabs wrap onto two lines at any sensible width. A column also
 * leaves room for the one-line description of each, which is what turns a list
 * of nouns into something navigable.
 */
export const SettingsNav = () => {
	const pathname = usePathname()
	const { data, isLoading } = useSettingsQuery()

	if (isLoading) {
		return (
			<div className="text-muted-foreground flex items-center gap-2 p-4 text-sm">
				<Loader2 className="size-4 animate-spin" />
			</div>
		)
	}

	return (
		<nav aria-label="Settings sections" className="bg-card rounded-lg border p-2">
			<ul className="space-y-0.5">
				{data?.groups.map((group) => {
					const href = `/admin/dashboard/settings/${group.key}`
					const active = pathname === href

					return (
						<li key={group.key}>
							<Link
								href={href}
								aria-current={active ? "page" : undefined}
								className={cn(
									"block rounded-md px-3 py-2 transition-colors",
									active
										? "bg-accent-soft text-foreground"
										: "text-muted-foreground hover:text-foreground hover:bg-muted"
								)}
							>
								<span className="block text-sm font-medium">{group.title}</span>
								{group.blurb && (
									<span className="mt-0.5 block text-xs opacity-80">{group.blurb}</span>
								)}
							</Link>
						</li>
					)
				})}
			</ul>
		</nav>
	)
}

export default SettingsNav
