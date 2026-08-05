import { getTranslations } from "next-intl/server"
import OrderDetail from "../_components/OrderDetail"

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
	const { locale } = await params
	const t = await getTranslations({ locale, namespace: "account" })
	return { title: t("orderNumber"), robots: { index: false, follow: false } }
}

export default async function OrderDetailPage({
	params,
}: {
	params: Promise<{ locale: string; id: string }>
}) {
	const { id } = await params
	return <OrderDetail id={id} />
}
