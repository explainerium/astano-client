import { getTranslations } from "next-intl/server"
import VerifyEmail from "./_components/VerifyEmail"

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
	const { locale } = await params
	const t = await getTranslations({ locale, namespace: "account" })
	return {
		title: t("verifyEmailTitle"),
		// A one-time token in the query string. Nothing here should be indexed.
		robots: { index: false, follow: false },
	}
}

/**
 * The landing page for an email-change confirmation link.
 *
 * Deliberately outside the account area and its guard: the link is opened
 * wherever the mailbox is, which is often a phone with no session. The token is
 * the authorisation.
 */
export default function VerifyEmailPage() {
	return <VerifyEmail />
}
