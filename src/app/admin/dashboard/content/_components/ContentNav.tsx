"use client"

import { useTranslations } from "next-intl"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Loader2 } from "lucide-react"
import { useContentQuery } from "@/redux/api/contentApi"
import { cn } from "@/lib/utils"
import useContentText from "./useContentText"

/**
 * One entry per page of the site.
 *
 * Built from the API's own group list, like SettingsNav — a group added to
 * contentRegistry.ts appears here with no change on this side.
 *
 * A column rather than a tab strip, for the reason SettingsNav gives: nine
 * entries wrap onto two lines as tabs at any sensible width, and a column
 * leaves room for the line of description that turns a list of page names into
 * something you can navigate without opening each one.
 */
export const ContentNav = () => {
	const t = useTranslations("admin")
	const text = useContentText()
	const pathname = usePathname()
	const { data, isLoading } = useContentQuery()

	if (isLoading) {
		return (
			<div className="text-muted-foreground flex items-center gap-2 p-4 text-sm">
				<Loader2 className="size-4 animate-spin" />
			</div>
		)
	}

	return (
		<nav aria-label={t("contentSections")} className="bg-card rounded-lg border p-2">
			<ul className="space-y-0.5">
				{(data?.groups ?? []).map((group) => {
					const href = `/admin/dashboard/content/${group.id}`
					const active = pathname === href

					return (
						<li key={group.id}>
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
								<span className="block text-sm font-medium">
									{text.groupTitle(group.id, group.title)}
								</span>
								<span className="mt-0.5 block text-xs opacity-80">
									{text.groupBlurb(group.id, group.blurb)}
								</span>
							</Link>
						</li>
					)
				})}

				{/*
				 * The three legal documents, apart from the groups above.
				 *
				 * Not one of them because it is not a set of fields — it is three
				 * documents with their own screen, and it sits under a rule for the
				 * same reason the sidebar's groups do: what is above is the shop
				 * talking, and what is below is what it is obliged to publish.
				 */}
				<li className="border-border mt-2 border-t pt-2">
					<Link
						href="/admin/dashboard/content/legal"
						aria-current={pathname === "/admin/dashboard/content/legal" ? "page" : undefined}
						className={cn(
							"block rounded-md px-3 py-2 transition-colors",
							pathname === "/admin/dashboard/content/legal"
								? "bg-accent-soft text-foreground"
								: "text-muted-foreground hover:text-foreground hover:bg-muted"
						)}
					>
						<span className="block text-sm font-medium">{t("legalDocuments")}</span>
						<span className="mt-0.5 block text-xs opacity-80">{t("legalDocumentsNav")}</span>
					</Link>
				</li>
			</ul>
		</nav>
	)
}

export default ContentNav
