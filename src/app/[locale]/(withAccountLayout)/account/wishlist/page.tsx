import { getTranslations } from "next-intl/server"
import WishlistView from "./_components/WishlistView"

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
	const { locale } = await params
	const t = await getTranslations({ locale, namespace: "account" })
	return { title: t("wishlistTitle"), robots: { index: false, follow: false } }
}

export default async function WishlistPage({ params }: { params: Promise<{ locale: string }> }) {
	const { locale } = await params
	const t = await getTranslations({ locale, namespace: "account" })

	return (
		<>
			<h2 className="font-heading mb-6 text-2xl font-extrabold tracking-tight">
				{t("wishlistTitle")}
			</h2>
			<WishlistView />
		</>
	)
}
