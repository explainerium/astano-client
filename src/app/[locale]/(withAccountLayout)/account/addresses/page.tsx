import { getTranslations } from "next-intl/server"
import AddressBook from "./_components/AddressBook"

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
	const { locale } = await params
	const t = await getTranslations({ locale, namespace: "account" })
	return { title: t("addressesTitle"), robots: { index: false, follow: false } }
}

export default function AddressesPage() {
	return <AddressBook />
}
