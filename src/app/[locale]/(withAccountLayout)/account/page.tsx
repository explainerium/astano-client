import { getTranslations } from "next-intl/server"
import AccountDashboard from "./_components/AccountDashboard"

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
	const { locale } = await params
	const t = await getTranslations({ locale, namespace: "account" })
	return { title: t("title"), robots: { index: false, follow: false } }
}

export default function AccountPage() {
	return <AccountDashboard />
}
