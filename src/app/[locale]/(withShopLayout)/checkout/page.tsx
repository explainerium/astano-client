import { getTranslations } from "next-intl/server"
import CheckoutView from "./_components/CheckoutView"

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
	const { locale } = await params
	const t = await getTranslations({ locale, namespace: "checkout" })
	return { title: t("title"), robots: { index: false, follow: false } }
}

export default function CheckoutPage() {
	return <CheckoutView />
}
