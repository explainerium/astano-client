"use client"

import { useTranslations } from "next-intl"
import type { ReactNode } from "react"
import ContentNav from "./_components/ContentNav"

/**
 * The content shell: pages on the left, one page's fields on the right.
 *
 * The same shape as the settings screen, and for the same reason — a page per
 * route means a section can be linked to, the back button steps through them,
 * and pressing Save on the FAQ has no business rewriting the home page.
 */
export default function ContentLayout({ children }: { children: ReactNode }) {
	const t = useTranslations("admin")

	return (
		<div className="space-y-5">
			<div>
				<h1 className="font-heading text-xl font-semibold tracking-tight">{t("content")}</h1>
				<p className="text-muted-foreground text-sm">{t("theWordsAndPicturesOnTheSite")}</p>
			</div>

			<div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start">
				<ContentNav />
				<div className="min-w-0">{children}</div>
			</div>
		</div>
	)
}
