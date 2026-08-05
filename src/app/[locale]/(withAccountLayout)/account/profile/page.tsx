import { getTranslations } from "next-intl/server"
import ProfileForm from "./_components/ProfileForm"

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
	const { locale } = await params
	const t = await getTranslations({ locale, namespace: "account" })
	return { title: t("profileTitle"), robots: { index: false, follow: false } }
}

export default async function ProfilePage({ params }: { params: Promise<{ locale: string }> }) {
	const { locale } = await params
	const t = await getTranslations({ locale, namespace: "account" })

	return (
		<>
			<h2 className="font-heading mb-6 text-2xl font-extrabold tracking-tight">
				{t("profileTitle")}
			</h2>
			<ProfileForm />
		</>
	)
}
