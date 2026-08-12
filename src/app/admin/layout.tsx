import type { Metadata } from "next"
import type { ReactNode } from "react"
import { NextIntlClientProvider } from "next-intl"
import { Mulish, Poppins } from "next/font/google"
import Providers from "@/lib/providers/Providers"
import { adminMessages, readAdminLocale } from "@/lib/adminLocale"
import "../globals.css"

const mulish = Mulish({ subsets: ["latin"], variable: "--font-mulish", display: "swap" })
const poppins = Poppins({
	subsets: ["latin"],
	weight: ["500", "600", "800"],
	variable: "--font-poppins",
	display: "swap",
})

export const metadata: Metadata = {
	title: {
		default: "astano® admin",
		template: "%s · astano® admin",
	},
	// Staff tooling has no business in a search index.
	robots: { index: false, follow: false },
}

/**
 * The dashboard's own document shell.
 *
 * Staff-only, so it sits outside [locale]: no locale prefix and no translated
 * slugs — /de/admin/produkte would be URL machinery for an audience of four.
 * The language is a cookie instead, set from the switcher in the topbar, and
 * is independent of the shop's own Site Language: the person managing the
 * catalogue need not speak the language the shop sells in.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
	const locale = await readAdminLocale()
	const messages = adminMessages(locale)

	return (
		<html
			lang={locale}
			// admin-theme carries the dashboard's own tokens — orange accent,
			// rounded cards, grey canvas. Scoped here so the storefront's §6.1
			// identity is unaffected.
			/**
			 * `overflow-hidden` on both, and it is load-bearing.
			 *
			 * The dashboard is an app shell, not a document: the sidebar and topbar
			 * are fixed and only the content column scrolls. Left scrollable, the
			 * page produced a *second* scrollbar beside the content's own — and
			 * dragging the outer one slid the whole shell, showing empty canvas
			 * below the sidebar.
			 *
			 * This is why the admin has its own root layout rather than sharing the
			 * storefront's, where the document is exactly what should scroll.
			 */
			className={`admin-theme ${mulish.variable} ${poppins.variable} h-full overflow-hidden antialiased`}
		>
			<body className="flex h-full flex-col overflow-hidden">
				<NextIntlClientProvider locale={locale} messages={messages}>
					<Providers>{children}</Providers>
				</NextIntlClientProvider>
			</body>
		</html>
	)
}
