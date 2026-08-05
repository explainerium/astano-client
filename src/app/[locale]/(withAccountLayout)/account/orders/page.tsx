import { getTranslations } from "next-intl/server"
import OrdersList from "./_components/OrdersList"

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
	const { locale } = await params
	const t = await getTranslations({ locale, namespace: "account" })
	return { title: t("ordersTitle"), robots: { index: false, follow: false } }
}

export default async function OrdersPage({ params }: { params: Promise<{ locale: string }> }) {
	const { locale } = await params
	const t = await getTranslations({ locale, namespace: "account" })

	return (
		<>
			<h2 className="font-heading mb-6 text-2xl font-extrabold tracking-tight">
				{t("ordersTitle")}
			</h2>
			<OrdersList />
		</>
	)
}
