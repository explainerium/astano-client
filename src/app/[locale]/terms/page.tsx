import LegalDocument from "@/components/shared/legal/LegalDocument"
import { loadLegalDocument } from "@/content/legal"

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
	const { locale } = await params
	const { title } = await loadLegalDocument("terms", locale)
	return { title }
}

/**
 * AGB / Terms and Conditions — post 1100 DE / 2468 EN.
 *
 * Ported verbatim, which means it inherits a problem: the German source holds
 * three overlapping copies of the terms, and the second contradicts the first
 * on whether astano sells to consumers. The live WordPress page renders all
 * three the same way. Fixing it is the client's call, not ours.
 */
export default async function TermsPage({ params }: { params: Promise<{ locale: string }> }) {
	const { locale } = await params
	return <LegalDocument slug="terms" locale={locale} />
}
