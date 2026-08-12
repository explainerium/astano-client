"use client"

import { useTranslations } from "next-intl"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Loader2 } from "lucide-react"
import { useSettingsQuery } from "@/redux/api/settingApi"
import { cn } from "@/lib/utils"
import useSettingText from "./useSettingText"

/**
 * The settings sub-navigation.
 *
 * Built from the API's own group list, like the fields themselves — a group
 * added in settingRegistry.ts appears here with no change on this side.
 *
 * Vertical rather than a top tab strip: there are eleven groups and counting,
 * and eleven tabs wrap onto two lines at any sensible width. A column also
 * leaves room for the one-line description of each, which is what turns a list
 * of nouns into something navigable.
 *
 * Grouped under headings for the same reason the sidebar is: eleven entries in
 * one column is a list to be read rather than navigated, and "Units" next to
 * "Invoices" tells nobody where to look for a question about VAT.
 */
export const SettingsNav = () => {
	const t = useTranslations("admin")
	const text = useSettingText()
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
		<nav aria-label={t("settingsSections")} className="bg-card rounded-lg border p-2">
			{(data?.sections ?? []).map((section, index) => {
				const groups = (data?.groups ?? []).filter((g) => g.section === section.key)
				if (!groups.length) return null

				return (
					<div key={section.key} className={cn(index > 0 && "border-border mt-2 border-t pt-2")}>
						<p className="text-muted-foreground px-3 pt-1 pb-1.5 text-[11px] font-medium tracking-wider uppercase">
							{text.sectionTitle(section.key, section.title)}
						</p>

						<ul className="space-y-0.5">
							{groups.map((group) => {
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
											<span className="block text-sm font-medium">{text.groupTitle(group.key, group.title)}</span>
											{group.blurb && (
												<span className="mt-0.5 block text-xs opacity-80">{text.groupBlurb(group.key, group.blurb)}</span>
											)}
										</Link>
									</li>
								)
							})}
						</ul>
					</div>
				)
			})}
		</nav>
	)
}

export default SettingsNav
