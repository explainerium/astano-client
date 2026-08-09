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
/** Mirrors the backend settingRegistry — what a setting is and how to render it. */
export type SettingType =
	| "text"
	| "number"
	| "boolean"
	| "select"
	| "country"
	| "countries"
	| "color"

export interface SettingDefinition {
	label: string
	help?: string
	type: SettingType
	options?: { value: string; label: string }[]
	fallback: string | number | boolean | string[]
	isPublic?: boolean
	group: string
}

export interface SettingGroup {
	key: string
	title: string
	blurb: string
}

export interface SettingsResponse {
	settings: Setting[]
	/** Keyed by setting key. The screen renders itself from this. */
	definitions: Record<string, SettingDefinition>
	groups: SettingGroup[]
}

/** Resolved values the storefront may read without signing in. */
export type PublicSettings = Record<string, string | number | boolean>

export interface SettingsPayload {
	settings: { key: string; value: unknown; isPublic?: boolean }[]
}
