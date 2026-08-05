import type { ReactNode } from "react"
import SiteFooter from "@/components/shared/footer/SiteFooter"
import SiteHeader from "@/components/shared/header/SiteHeader"

/**
 * Chrome for the shop routes — listing, product, category, cart, checkout and
 * the quote basket.
 *
 * The content pages render the header themselves because each one is a single
 * page; here six routes share it, so it belongs in the layout that the route
 * group already exists to provide.
 */
export default async function ShopLayout({
	children,
	params,
}: {
	children: ReactNode
	params: Promise<{ locale: string }>
}) {
	const { locale } = await params

	return (
		<>
			<SiteHeader locale={locale} />
			<main className="flex-1">{children}</main>
			<SiteFooter locale={locale} />
		</>
	)
}
