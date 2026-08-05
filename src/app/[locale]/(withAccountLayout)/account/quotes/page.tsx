import { getTranslations } from "next-intl/server"
import QuotesList from "./_components/QuotesList"

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
	const { locale } = await params
	const t = await getTranslations({ locale, namespace: "account" })
	return { title: t("quotesTitle"), robots: { index: false, follow: false } }
}

export default async function QuotesPage({ params }: { params: Promise<{ locale: string }> }) {
	const { locale } = await params
	const t = await getTranslations({ locale, namespace: "account" })

	return (
		<>
			<h2 className="font-heading mb-6 text-2xl font-extrabold tracking-tight">
				{t("quotesTitle")}
			</h2>
			<QuotesList />
		</>
	)
}
