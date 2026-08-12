"use client"

import { useTransition } from "react"
import { useTranslations, useLocale } from "next-intl"
import { Globe, Loader2 } from "lucide-react"
import { locales, type Locale } from "@/i18n/routing"
import { setAdminLocale } from "@/app/admin/_actions/setAdminLocale"
import { cn } from "@/lib/utils"

/**
 * The dashboard's language control.
 *
 * Two buttons rather than links: there is no German URL for a dashboard page to
 * link to — the choice is a stored preference, not a destination — so a link
 * would be a lie about what clicking does.
 *
 * `useTransition` keeps the current screen on the page while the server rebuilds
 * it in the other language. Without it the dashboard blanks on every switch,
 * which for a one-word change reads as something having gone wrong.
 */

const LABELS: Record<Locale, { short: string; full: string }> = {
	de: { short: "DE", full: "Deutsch" },
	en: { short: "EN", full: "English" },
}

const LanguageMenu = ({ className }: { className?: string }) => {
	const t = useTranslations("admin")
	const active = useLocale() as Locale
	const [pending, startTransition] = useTransition()

	return (
		<div className={cn("flex items-center gap-1.5", className)}>
			{pending ? (
				<Loader2 className="text-muted-foreground size-4 shrink-0 animate-spin" aria-hidden />
			) : (
				<Globe className="text-muted-foreground size-4 shrink-0" strokeWidth={1.5} aria-hidden />
			)}

			<div className="flex items-center" role="group" aria-label={t("language")}>
				{locales.map((locale, index) => (
					<div key={locale} className="flex items-center">
						{index > 0 && (
							<span className="text-border mx-1" aria-hidden>
								|
							</span>
						)}

						<button
							type="button"
							title={LABELS[locale].full}
							aria-pressed={locale === active}
							disabled={pending || locale === active}
							onClick={() => startTransition(() => setAdminLocale(locale))}
							className={cn(
								"text-[13px] transition-colors",
								locale === active
									? "text-foreground font-semibold"
									: "text-muted-foreground hover:text-primary font-medium"
							)}
						>
							{LABELS[locale].short}
						</button>
					</div>
				))}
			</div>
		</div>
	)
}

export default LanguageMenu
