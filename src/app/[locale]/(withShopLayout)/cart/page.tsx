import { getTranslations } from "next-intl/server"
import CartView from "./_components/CartView"

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
	const { locale } = await params
	const t = await getTranslations({ locale, namespace: "cart" })
	// A cart is per-visitor and has no business in a search index.
	return { title: t("title"), robots: { index: false, follow: false } }
}

export default function CartPage() {
	return <CartView />
}
