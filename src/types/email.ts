/** Mirrors the backend email module — the registry and the admin's overrides. */

export type EmailAudience = "customer" | "staff"

export interface EmailOverride {
	enabled: boolean
	/** Empty means the built-in translated default. */
	subject: string
	heading: string
	additionalContent: string
	/** Staff mail only. Empty falls back to the configured address. */
	recipient: string
}

export interface EmailTemplate {
	key: string
	label: string
	description: string
	audience: EmailAudience
	/**
	 * False for account recovery and the security notices. The screen renders
	 * the switch as locked rather than hiding it, so it is clear the mail exists
	 * and clear why it cannot be turned off.
	 */
	canDisable: boolean
	recipientSetting?: string
	override: EmailOverride
}

export interface EmailPreview {
	subject: string
	html: string
	text: string
}
