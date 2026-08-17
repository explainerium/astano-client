/** Mirrors the backend setting module. Keys are dotted and free-form. */

export interface Setting {
	key: string
	value: unknown
	/** Public settings are served to the storefront by `GET /settings/public`. */
	isPublic: boolean
	updatedAt: string
	/**
	 * Credentials only (`type: "password"`). `value` is always empty for these —
	 * the API does not return a stored secret — so these two are all the screen
	 * gets: whether one is saved, and a mask to recognise it by.
	 */
	isSet?: boolean
	preview?: string | null
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
	/** Stored encrypted, never sent back. An empty box means "leave it alone". */
	| "password"

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
	/** Which heading the group sits under in the menu. */
	section: string
}

export interface SettingSection {
	key: string
	title: string
}

export interface SettingsResponse {
	settings: Setting[]
	/** Keyed by setting key. The screen renders itself from this. */
	definitions: Record<string, SettingDefinition>
	groups: SettingGroup[]
	/** In display order. Groups are filed under these by their `section`. */
	sections: SettingSection[]
}

/** Resolved values the storefront may read without signing in. */
export type PublicSettings = Record<string, string | number | boolean>

export interface SettingsPayload {
	settings: { key: string; value: unknown; isPublic?: boolean }[]
}

/**
 * What the mail server test reports.
 *
 * `ok: false` arrives on a 200 — the request succeeded in asking, and the
 * answer is the interesting part. `message` is the mail server's own words
 * ("535 Authentication failed"), which is the only thing that tells an admin
 * whether they pasted the wrong key or the wrong port.
 */
export interface MailTestResult {
	ok: boolean
	message: string
	/** Whether the settings or the deployment's environment supplied the server. */
	source?: "settings" | "environment"
	host?: string
}
