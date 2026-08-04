/** Mirrors the backend setting module. Keys are dotted and free-form. */

export interface Setting {
	key: string
	value: unknown
	/** Public settings are served to the storefront by `GET /settings/public`. */
	isPublic: boolean
	updatedAt: string
}

/**
 * The list response carries the catalogue with it — `known` is
 * `KNOWN_SETTINGS` from the service, key → human description. The admin renders
 * the catalogue rather than a bare key/value grid, so the form documents itself
 * and stays in step with the backend without a second copy of the list here.
 */
export interface SettingsResponse {
	settings: Setting[]
	known: Record<string, string>
}

export interface SettingsPayload {
	settings: { key: string; value: unknown; isPublic?: boolean }[]
}
