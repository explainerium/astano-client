import type { Metadata } from "next"
import type { ReactNode } from "react"
import { NextIntlClientProvider } from "next-intl"
import { Mulish, Poppins } from "next/font/google"
import Providers from "@/lib/providers/Providers"
import messages from "../../../messages/en.json"
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
 * Staff-only and English-only, so it sits outside [locale]: no locale prefix,
 * no translated slugs, no language switcher. The English catalogue is imported
 * directly rather than resolved per request — there is nothing to resolve.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
	return (
		<html
			lang="en"
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
				<NextIntlClientProvider locale="en" messages={messages}>
					<Providers>{children}</Providers>
				</NextIntlClientProvider>
			</body>
		</html>
	)
}
