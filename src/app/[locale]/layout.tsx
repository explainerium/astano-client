import type { Metadata } from "next"
import type { ReactNode } from "react"
import { notFound } from "next/navigation"
import { Lato, Mulish, Poppins } from "next/font/google"
import { NextIntlClientProvider } from "next-intl"
import { getMessages } from "next-intl/server"
import { locales, routing, type Locale } from "@/i18n/routing"
import Providers from "@/lib/providers/Providers"
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

export const metadata: Metadata = {
	metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
	title: {
		default: "astano®",
		template: "%s · astano®",
	},
	description: "Custom stainless-steel baking hardware, made in Germany.",
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
			// next-themes writes the theme class onto <html> before React
			// hydrates, which would otherwise be reported as a mismatch.
			suppressHydrationWarning
		>
			<body className="flex min-h-full flex-col">
				<NextIntlClientProvider messages={messages}>
					<Providers>{children}</Providers>
				</NextIntlClientProvider>
			</body>
		</html>
	)
}
