import { getTranslations } from "next-intl/server"
import QuoteBasketView from "./_components/QuoteBasketView"

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
	const { locale } = await params
	const t = await getTranslations({ locale, namespace: "quoteBasket" })
	// Per-visitor, like the cart — not something to index.
	return { title: t("title"), robots: { index: false, follow: false } }
}

export default function QuoteBasketPage() {
	return <QuoteBasketView />
}
