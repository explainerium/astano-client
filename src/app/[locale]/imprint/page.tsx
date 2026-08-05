import LegalDocument from "@/components/shared/legal/LegalDocument"
import { loadLegalDocument } from "@/content/legal"

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
	const { locale } = await params
	const { title } = await loadLegalDocument("imprint", locale)
	return { title }
}

/** Impressum / Imprint — post 1078 DE / 2384 EN. Required by §5 TMG. */
export default async function ImprintPage({ params }: { params: Promise<{ locale: string }> }) {
	const { locale } = await params
	return <LegalDocument slug="imprint" locale={locale} />
}
