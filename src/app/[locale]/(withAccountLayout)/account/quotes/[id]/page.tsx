import { getTranslations } from "next-intl/server"
import QuoteDetail from "../_components/QuoteDetail"

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
	const { locale } = await params
	const t = await getTranslations({ locale, namespace: "account" })
	return { title: t("quoteNumber"), robots: { index: false, follow: false } }
}

export default async function QuoteDetailPage({
	params,
}: {
	params: Promise<{ locale: string; id: string }>
}) {
	const { id } = await params
	return <QuoteDetail id={id} />
}
