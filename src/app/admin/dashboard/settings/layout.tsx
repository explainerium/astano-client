"use client"

import { useTranslations } from "next-intl"
import type { ReactNode } from "react"
import SettingsNav from "./_components/SettingsNav"

/**
 * The settings shell: section list on the left, one section on the right.
 *
 * Everything used to be stacked on one page, which worked while there were
 * three groups and stopped working at eight — the currency fields were four
 * scrolls below the company address, and pressing Save wrote all of it back.
 * A section per route also means a link to one of them can be sent to someone.
 */
export default function SettingsLayout({ children }: { children: ReactNode }) {
	const t = useTranslations("admin")
	return (
		<div className="space-y-5">
			<div>
				<h1 className="font-heading text-xl font-semibold tracking-tight">{t("settings")}</h1>
				<p className="text-muted-foreground text-sm">{t("howTheShopPresentsItselfPrices")}</p>
			</div>

			<div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start">
				<SettingsNav />
				<div className="min-w-0">{children}</div>
			</div>
		</div>
	)
}
