/**
 * The last public settings the shop successfully served.
 *
 * Kept because the API is not always instant. On the free Render tier it sleeps
 * after a quarter of an hour, and the first request back takes the better part
 * of a minute — during which `usePublicSettingsQuery` has no data and every
 * price on the page falls back to the built-in defaults.
 *
 * That failure is invisible, which is what makes it expensive: a shop whose
 * separators happen to differ from the defaults looks like its settings have
 * stopped working, and only on the deployed site, because a local API answers
 * in two milliseconds and the window never opens.
 *
 * So the last good block is remembered and used while the next one is on its
 * way. Stale by at most one change, rather than wrong by a whole configuration.
 */

const KEY = "astano.publicSettings.v1"

export type PublicSettingsBlock = Record<string, unknown>

/** Null on the server, on a first visit, or if anything about the store is off. */
export const readLastKnownSettings = (): PublicSettingsBlock | null => {
	if (typeof window === "undefined") return null

	try {
		const raw = window.localStorage.getItem(KEY)
		if (!raw) return null

		const parsed = JSON.parse(raw) as unknown
		return parsed && typeof parsed === "object" ? (parsed as PublicSettingsBlock) : null
	} catch {
		// Private browsing, a full quota, or a value someone else wrote. None of
		// them are worth failing a page render over.
		return null
	}
}

export const rememberSettings = (settings: PublicSettingsBlock): void => {
	if (typeof window === "undefined") return

	try {
		window.localStorage.setItem(KEY, JSON.stringify(settings))
	} catch {
		// Storage is a convenience here, never a requirement.
	}
}
