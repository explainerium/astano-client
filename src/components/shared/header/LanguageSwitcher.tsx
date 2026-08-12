"use client"

import type { ComponentProps } from "react"
import { useLocale } from "next-intl"
import { useParams } from "next/navigation"
import { Globe } from "lucide-react"
import { locales, type Locale } from "@/i18n/routing"
import { Link, usePathname } from "@/i18n/navigation"
import { usePublicSettingsQuery } from "@/redux/api/settingApi"
import { cn } from "@/lib/utils"

/**
 * The language switcher.
 *
 * Rendered as two links rather than a select, because that is what it is: the
 * German and English versions of the page you are on are two different URLs,
 * and a link is the thing a browser can open in a new tab, a crawler can
 * follow, and a reader can middle-click.
 *
 * `usePathname` from the routing config gives the *internal* route — "/products"
 * even when the address bar says "/produkte" — so the `Link` below can write
 * each locale's own slug. Building it from the raw address would send a German
 * visitor to /en/produkte, which does not exist.
 *
 * The admin can hide it entirely from Settings → Language, for a shop that
 * wants to run in one language without advertising the other.
 */

const LABELS: Record<Locale, { short: string; full: string }> = {
	de: { short: "DE", full: "Deutsch" },
	en: { short: "EN", full: "English" },
}

const LanguageSwitcher = ({ className }: { className?: string }) => {
	const active = useLocale() as Locale
	const pathname = usePathname()

	/**
	 * Dynamic segments — a product slug, a category slug — are not in the
	 * pathname and have to be handed back to `Link` for it to rebuild the URL.
	 *
	 * Cast because the types cannot express what is true here. `pathnames` pairs
	 * each route with the exact params it takes, and this component is generic
	 * over all of them: it does not know at compile time that it is on
	 * "/products/[slug]" rather than "/categories/[slug]". At runtime the two
	 * always agree, because both come from the route being rendered.
	 */
	const params = useParams()

	/**
	 * `pathnames` types each route together with the exact params it takes, and
	 * this component is generic over every route at once — so the pair has to be
	 * asserted rather than inferred. The assertion holds because both halves come
	 * from the route currently being rendered.
	 */
	const href = { pathname, params } as ComponentProps<typeof Link>["href"]

	const { data: settings } = usePublicSettingsQuery()

	// Undefined while the settings load. Shown rather than hidden in that
	// window: a switcher that appears a second late is a jump, and the default
	// is on anyway.
	if (settings?.["language.showSwitcher"] === false) return null

	return (
		<div className={cn("flex items-center gap-1.5", className)}>
			<Globe className="text-muted-foreground size-4 shrink-0" strokeWidth={1.5} aria-hidden />

			<ul className="flex items-center">
				{locales.map((locale, index) => (
					<li key={locale} className="flex items-center">
						{index > 0 && <span className="text-border mx-1" aria-hidden>|</span>}

						{locale === active ? (
							// The current language is not a link. Offering to navigate to
							// the page you are already on is noise, and screen readers
							// announce it as a destination.
							<span aria-current="true" className="text-foreground text-[13px] font-semibold">
								{LABELS[locale].short}
							</span>
						) : (
							<Link
								href={href}
								locale={locale}
								hrefLang={locale}
								// The full name, so the label is not two letters of jargon
								// to somebody who does not recognise the code.
								title={LABELS[locale].full}
								className="text-muted-foreground hover:text-primary text-[13px] font-medium transition-colors"
							>
								{LABELS[locale].short}
							</Link>
						)}
					</li>
				))}
			</ul>
		</div>
	)
}

export default LanguageSwitcher
