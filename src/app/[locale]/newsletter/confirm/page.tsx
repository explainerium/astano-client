import { getTranslations } from "next-intl/server"
import NewsletterConfirm from "./_components/NewsletterConfirm"

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
	const { locale } = await params
	const t = await getTranslations({ locale, namespace: "newsletterConfirm" })
	return {
		title: t("title"),
		// A one-time token in the query string. Nothing here should be indexed.
		robots: { index: false, follow: false },
	}
}

/**
 * Where the newsletter confirmation link lands — the double opt-in's second
 * half. Nothing is mailable until this page has run.
 */
export default function NewsletterConfirmPage() {
	return <NewsletterConfirm />
}
