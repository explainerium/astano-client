import LegalDocument from "@/components/shared/legal/LegalDocument"
import { loadLegalDocument } from "@/content/legal"

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
	const { locale } = await params
	const { title } = await loadLegalDocument("privacy", locale)
	return { title }
}

/** Datenschutzerklärung / Privacy Policy — post 1031 DE / 2462 EN. */
export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
	const { locale } = await params
	return <LegalDocument slug="privacy" locale={locale} />
}
