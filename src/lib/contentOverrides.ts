import "server-only"

/**
 * What the shop has changed about the pages, fetched for one language.
 *
 * The copy on the marketing pages ships in messages/{de,en}.json and its
 * pictures ship beside it; those are the defaults and they stay. This reads the
 * *overrides* the dashboard has stored and hands them to request.ts, which
 * merges them over the shipped catalogue before next-intl ever sees it. A key
 * with no override is simply absent here, so nothing to merge means the page
 * reads exactly as it was built.
 *
 * That is the property this whole feature rests on: **an empty answer, a failed
 * request and a database nobody has written to are the same thing** — today's
 * site. There is no state in which a content service being unwell produces a
 * blank page, and the fallbacks below are written to keep it that way.
 *
 * Two caches would give two answers, which is the mistake languagePolicy.ts
 * documents avoiding. So there is one cache for success — Next's own, tagged,
 * because a tag can be revalidated the instant an editor presses Save and does
 * so across every running instance, which a per-process window cannot. Failure
 * is handled separately and deliberately: a short local stand-off, because the
 * API sleeps on the free tier and takes the better part of a minute to wake,
 * and without it every visitor in that minute starts their own doomed fetch and
 * waits out the timeout individually.
 */

export interface ContentOverrides {
	/** Dotted catalogue key → the text the shop wrote. Per language. */
	entries: Record<string, string>
	/** Dotted catalogue key → a picture URL. Shared by both languages. */
	media: Record<string, string>
}

const EMPTY: ContentOverrides = { entries: {}, media: {} }

/**
 * The public API origin, as the storefront's server half reaches it.
 *
 * The same variable languagePolicy.ts uses, for the same reason: on Vercel the
 * server and the browser reach the API at the same address, and a second
 * "internal" variable that the deployment does not set is how a fetch ends up
 * pointed at the storefront's own domain.
 */
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1"

/** The cache tag the admin's save invalidates. One tag, all languages. */
export const CONTENT_TAG = "content"

/**
 * A ceiling, not the mechanism. Saves invalidate the tag directly, so this is
 * only how long a change made somewhere the tag did not reach can linger.
 */
const REVALIDATE_SECONDS = 60

/** A page must never wait on this. */
const TIMEOUT_MS = 1_500

/** How long to stop asking after a failure, per process. */
const FAILURE_TTL_MS = 30_000

let failingUntil = 0

export const readContentOverrides = async (locale: string): Promise<ContentOverrides> => {
	if (Date.now() < failingUntil) return EMPTY

	try {
		const response = await fetch(
			`${API_BASE}/content/public?locale=${encodeURIComponent(locale)}`,
			{
				signal: AbortSignal.timeout(TIMEOUT_MS),
				next: { revalidate: REVALIDATE_SECONDS, tags: [CONTENT_TAG] },
			}
		)

		if (!response.ok) throw new Error(`content responded ${response.status}`)

		const body = (await response.json()) as { data?: Partial<ContentOverrides> }

		return {
			entries: body.data?.entries ?? {},
			media: body.data?.media ?? {},
		}
	} catch {
		// Deliberately silent, like languagePolicy's. This runs on page renders,
		// and an API that is merely asleep is an expected state on this hosting
		// rather than an incident worth a log line per visitor.
		failingUntil = Date.now() + FAILURE_TTL_MS
		return EMPTY
	}
}

/**
 * Write one dotted key into a nested catalogue.
 *
 * The keys are the catalogue's own paths, so `home.hero.slides.0.title` has to
 * land inside the `slides` **array** that shipped — not replace it with an
 * object keyed "0", which is what a naive walk does and what would leave
 * `slides.map` iterating nothing.
 *
 * A path that does not already exist is skipped rather than created. An
 * override only ever replaces something the catalogue shipped; inventing a
 * branch would mean a stale row could grow a shape the components do not read.
 */
const applyOverride = (root: Record<string, unknown>, key: string, value: string): void => {
	const path = key.split(".")
	const leaf = path.pop()
	if (!leaf) return

	let node: unknown = root
	for (const step of path) {
		if (node === null || typeof node !== "object") return
		node = (node as Record<string, unknown>)[step]
	}

	if (node === null || typeof node !== "object") return
	const parent = node as Record<string, unknown>
	if (!(leaf in parent)) return

	/**
	 * A list arrives as one JSON value, replacing the whole array.
	 *
	 * That is what lets the shop add a tenth FAQ question: per-item keys can
	 * only overwrite items the catalogue already has, so a new one would land on
	 * a key nothing reads and change nothing. The whole array grows and shrinks
	 * together.
	 *
	 * Recognised from what shipped rather than from a registry the storefront
	 * would have to carry — the catalogue already knows `faq.groups.0.items` is
	 * an array. Anything that does not parse into one is left alone, so a
	 * malformed row cannot replace a list with a string and break the `.map`
	 * that renders it.
	 */
	if (Array.isArray(parent[leaf])) {
		try {
			const parsed: unknown = JSON.parse(value)
			if (Array.isArray(parsed)) parent[leaf] = parsed
		} catch {
			// Leave the shipped list in place.
		}
		return
	}

	parent[leaf] = value
}

/**
 * The shipped catalogue with the shop's changes written over it.
 *
 * Cloned first, and that is not tidiness: the imported JSON is module state,
 * shared by every request this process serves. Writing into it would leak one
 * visitor's language into another's, and would compound until the process was
 * recycled.
 */
export const mergeContent = (
	messages: Record<string, unknown>,
	overrides: ContentOverrides
): Record<string, unknown> => {
	const entries = Object.entries(overrides.entries)
	const media = Object.entries(overrides.media)
	if (!entries.length && !media.length) return messages

	const merged = structuredClone(messages)
	for (const [key, value] of entries) applyOverride(merged, key, value)
	for (const [key, url] of media) applyOverride(merged, key, url)
	return merged
}
