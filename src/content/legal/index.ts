/**
 * The three legal documents, ported verbatim from WordPress.
 *
 * The text lives in generated JSON beside this file rather than in
 * messages/*.json for two reasons: it is large (the German privacy policy
 * alone is ~10,000 words, which has no business in the client message bundle
 * every page loads), and it is rich HTML rather than interpolated strings.
 *
 * The JSON is produced by sanitising wp_posts.post_content down to an
 * allowlist of tags with every attribute stripped except href, so it is safe
 * to inject. Do not hand-edit it — regenerate it, or replace it wholesale when
 * the client supplies new wording.
 */
export type LegalSlug = "imprint" | "privacy" | "terms"

export interface LegalDocument {
	title: string
	html: string
}

/**
 * Loaders rather than eager imports, so visiting the Impressum does not also
 * pull the privacy policy and the terms into the same chunk.
 */
const DOCUMENTS: Record<LegalSlug, Record<"de" | "en", () => Promise<{ default: LegalDocument }>>> =
	{
		imprint: {
			de: () => import("./imprint.de.json"),
			en: () => import("./imprint.en.json"),
		},
		privacy: {
			de: () => import("./privacy.de.json"),
			en: () => import("./privacy.en.json"),
		},
		terms: {
			de: () => import("./terms.de.json"),
			en: () => import("./terms.en.json"),
		},
	}

export const loadLegalDocument = async (
	slug: LegalSlug,
	locale: string
): Promise<LegalDocument> => {
	const load = DOCUMENTS[slug][locale === "de" ? "de" : "en"]
	const { default: document } = await load()
	return document
}
