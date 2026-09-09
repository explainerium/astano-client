import type { Metadata } from "next"
import type { ReactNode } from "react"
import { notFound } from "next/navigation"
import { Lato, Mulish, Poppins } from "next/font/google"
import { NextIntlClientProvider } from "next-intl"
import { getMessages, getTranslations } from "next-intl/server"
import { locales, routing, type Locale } from "@/i18n/routing"
import Providers from "@/lib/providers/Providers"
import EditThisPage from "@/components/shared/EditThisPage"
import { SITE_URL } from "@/lib/siteUrl"
import "../globals.css"

/**
 * The three brand families from spec §6.1. Self-hosted by next/font, so there
 * is no request to Google at runtime and no layout shift while they load.
 */
const mulish = Mulish({
	subsets: ["latin"],
	variable: "--font-mulish",
	display: "swap",
})

const poppins = Poppins({
	subsets: ["latin"],
	// 500 product titles · 600 headings and widget titles · 800 section headings
	weight: ["500", "600", "800"],
	variable: "--font-poppins",
	display: "swap",
})

const lato = Lato({
	subsets: ["latin"],
	weight: ["400", "700"],
	variable: "--font-lato",
	display: "swap",
})

export function generateStaticParams() {
	return routing.locales.map((locale) => ({ locale }))
}

/**
 * Per-locale metadata. A static `metadata` export cannot read the locale, which
 * is how the German pages ended up advertising an English description to search
 * engines.
 */
export async function generateMetadata({
	params,
}: {
	params: Promise<{ locale: string }>
}): Promise<Metadata> {
	const { locale } = await params
	const t = await getTranslations({ locale, namespace: "site" })

	return {
		metadataBase: new URL(SITE_URL),
		title: {
			default: t("title"),
			template: `%s · ${t("title")}`,
		},
		description: t("description"),
		// No `alternates.languages` here on purpose. next-intl's middleware
		// already emits per-page hreflang Link headers — and correctly, pointing
		// at the translated slug (/register ↔ /de/registrieren) plus x-default.
		// Declaring them in the layout would apply one set to every page and
		// claim the German alternate of any page is /de, which is false.
	}
}

export default async function LocaleLayout({
	children,
	params,
}: {
	children: ReactNode
	params: Promise<{ locale: string }>
}) {
	const { locale } = await params
	if (!locales.includes(locale as Locale)) notFound()

	const messages = await getMessages()

	return (
		<html
			lang={locale}
			className={`${mulish.variable} ${poppins.variable} ${lato.variable} h-full antialiased`}
		>
			{/*
			 * Browser extensions write on this tag before React reaches it.
			 *
			 * Grammarly adds `data-gr-ext-installed` and
			 * `data-new-gr-c-s-check-loaded`; password managers and translators
			 * add their own. None of it is in the server's HTML, so hydration
			 * finds attributes it did not render and warns — intermittently,
			 * because whether the extension gets there first is a race.
			 *
			 * There is nothing to fix in the page: React says so itself in that
			 * warning, and it leaves the attributes alone rather than trying to
			 * patch them. The warning is also development-only. It is worth
			 * silencing anyway, because a console that cries wolf on every load
			 * is a console nobody reads the real mismatch out of.
			 *
			 * `suppressHydrationWarning` is exactly one level deep — this tag's
			 * own attributes and text, and nothing inside it. Every component on
			 * the page is still checked as before, so a genuine mismatch in the
			 * app still shows up. It is not on `<html>`: nothing has been seen
			 * touching that, and `lang` and `className` there are worth hearing
			 * about if they ever disagree.
			 */}
			<body className="flex min-h-full flex-col" suppressHydrationWarning>
				<NextIntlClientProvider messages={messages}>
					<Providers>
						{children}
						{/* Draws nothing for anyone but a signed-in ADMIN. */}
						<EditThisPage />
					</Providers>
				</NextIntlClientProvider>
			</body>
		</html>
	)
}
