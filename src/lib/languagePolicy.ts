import { routing, type Locale } from "@/i18n/routing"

/**
 * The shop's language policy, read for the proxy.
 *
 * Two settings decide where an *undecided* visitor lands: which language the
 * shop opens in, and whether a browser preference is allowed to override it.
 * Both are admin-controlled, so the proxy has to ask the API rather than read a
 * constant — and asking on the request path is exactly where this has to be
 * careful.
 *
 * Three defences, because the API sleeps on the free tier and takes the better
 * part of a minute to wake:
 *
 *  1. A short timeout. A page load must never wait on a preference.
 *  2. A cache, so at most one request per instance per TTL pays for it.
 *  3. A failure is cached too, briefly. Otherwise a sleeping API means every
 *     visitor starts a doomed fetch and waits out the timeout individually.
 *
 * Falling back to the compiled default is always correct here. The worst case
 * is that a first-time visitor sees German on a shop whose admin has since
 * chosen English — a preference, not a fault, and their own choice still wins
 * the moment they make one.
 */

export interface LanguagePolicy {
	/** Where a visitor with no stored choice is sent. */
	defaultLocale: Locale
	/** Whether Accept-Language may override the above. */
	detectFromBrowser: boolean
}

const FALLBACK: LanguagePolicy = {
	defaultLocale: routing.defaultLocale,
	detectFromBrowser: false,
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1"

const TTL_MS = 5 * 60 * 1000
/** Shorter, so a shop that was merely asleep recovers within a few minutes. */
const FAILURE_TTL_MS = 60 * 1000
const TIMEOUT_MS = 1_000

let cached: { policy: LanguagePolicy; until: number } | null = null

const isLocale = (value: unknown): value is Locale =>
	typeof value === "string" && (routing.locales as readonly string[]).includes(value)

export const readLanguagePolicy = async (): Promise<LanguagePolicy> => {
	if (cached && Date.now() < cached.until) return cached.policy

	try {
		const response = await fetch(`${API_BASE}/settings/public`, {
			signal: AbortSignal.timeout(TIMEOUT_MS),
			// Next would otherwise cache this in its own data cache with different
			// semantics than the window above, giving two answers to the question.
			cache: "no-store",
		})

		if (!response.ok) throw new Error(`settings responded ${response.status}`)

		const body = (await response.json()) as { data?: Record<string, unknown> }
		const settings = body.data ?? {}

		const policy: LanguagePolicy = {
			defaultLocale: isLocale(settings["language.default"])
				? settings["language.default"]
				: FALLBACK.defaultLocale,
			detectFromBrowser: settings["language.detectFromBrowser"] === true,
		}

		cached = { policy, until: Date.now() + TTL_MS }
		return policy
	} catch {
		// Deliberately silent. This runs on every request that misses the cache,
		// and a sleeping API is an expected state on this hosting, not an
		// incident worth a log line per visitor.
		cached = { policy: FALLBACK, until: Date.now() + FAILURE_TTL_MS }
		return FALLBACK
	}
}
