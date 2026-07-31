import type { ReactNode } from "react"

/**
 * Passthrough root layout — deliberately no <html> or <body>.
 *
 * Two independent trees sit below this one and each renders its own document
 * shell: [locale]/ for the bilingual storefront, and admin/ for the staff
 * dashboard, which has no locale segment. Putting the shell here instead would
 * force the admin through locale routing it does not want.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
	return children
}
