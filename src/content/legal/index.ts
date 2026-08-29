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
import { CONTENT_TAG } from "@/lib/contentOverrides"

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1"

/** One window and one tag for both, so a single Save clears the whole site. */
const REVALIDATE_SECONDS = 60
const TIMEOUT_MS = 1_500

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

/**
 * Every shipped document, in every language — for the dashboard to open with.
 *
 * The editor has to show what is on the site, and for a document nobody has
 * rewritten that is the file beside this one. Read on the server and handed
 * down as props: importing six of these into the client bundle would add about
 * a quarter of a megabyte of legal HTML to the dashboard, and this way none of
 * it is in the bundle at all.
 *
 * Keyed `slug.locale`, flat, because that is how the form addresses its fields.
 */
export const loadShippedLegal = async (): Promise<Record<string, LegalDocument>> => {
	const slugs = Object.keys(DOCUMENTS) as LegalSlug[]

	const pairs = await Promise.all(
		slugs.flatMap((slug) =>
			(["de", "en"] as const).map(async (locale) => {
				const { default: document } = await DOCUMENTS[slug][locale]()
				return [`${slug}.${locale}`, document] as const
			})
		)
	)

	return Object.fromEntries(pairs)
}

/**
 * The document as the site should show it: the shop's version if it has one,
 * else the one that shipped.
 *
 * The same override arrangement the message catalogue uses, and the only place
 * it is applied for these three — LegalDocument calls this and knows nothing
 * about where the words came from.
 *
 * Fetched apart from the rest of the content, because the German privacy policy
 * alone is about ten thousand words: putting it in the payload every page
 * render merges would charge every page on the site for a document three of
 * them display.
 *
 * A failure is not an error worth showing. The file below is a complete, valid
 * copy of the document, so falling back to it leaves a correct page rather than
 * a blank one — which for the Impressum and the AGB is not a cosmetic
 * distinction.
 */
export const loadLegalDocument = async (
	slug: LegalSlug,
	locale: string
): Promise<LegalDocument> => {
	const load = DOCUMENTS[slug][locale === "de" ? "de" : "en"]
	const { default: document } = await load()

	try {
		const response = await fetch(
			`${API_BASE}/content/pages/${slug}?locale=${encodeURIComponent(locale)}`,
			{
				signal: AbortSignal.timeout(TIMEOUT_MS),
				next: { revalidate: REVALIDATE_SECONDS, tags: [CONTENT_TAG] },
			}
		)
		if (!response.ok) throw new Error(`content responded ${response.status}`)

		const body = (await response.json()) as { data?: { title?: string; bodyHtml?: string } | null }
		const stored = body.data

		// A row with an empty body is a document somebody deliberately cleared,
		// and is respected. No row at all is the ordinary state and falls through.
		if (stored && typeof stored.title === "string" && typeof stored.bodyHtml === "string") {
			return { title: stored.title, html: stored.bodyHtml }
		}
	} catch {
		// Silent, like the catalogue's own fetch: a sleeping API is expected on
		// this hosting rather than an incident worth a log line per visitor.
	}

	return document
}
