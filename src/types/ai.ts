/** Mirrors the backend ai module. */

export type AiProvider = "anthropic" | "openai"

/** Which field is being written, which decides the shape of the answer. */
export type AiKind = "product" | "productShort" | "category" | "content"

/** Whether the editors should offer the button at all. Carries no key. */
export interface AiStatus {
	enabled: boolean
	/** A key is stored. Whether it works is what the test is for. */
	configured: boolean
	provider: AiProvider
	model: string
}

export interface AiGenerateInput {
	kind: AiKind
	locale: "de" | "en"
	/** What the editor typed into the box. */
	brief: string
	name?: string
	sku?: string
	/** Sizes, materials, attribute values — context the field already knows. */
	facts?: string[]
	/** Present means rewrite this rather than write something new. */
	existing?: string
}

export interface AiTranslateInput {
	text: string
	from: "de" | "en"
	to: "de" | "en"
	/** Whether the field holds HTML. A name and a description round-trip differently. */
	html: boolean
}

export interface AiGenerateResult {
	text: string
	provider: AiProvider
	model: string
}

/**
 * What the key test reports.
 *
 * `ok: false` arrives on a 200, like the mail test: the request succeeded in
 * asking, and the provider's own sentence is the answer worth reading.
 */
export interface AiTestResult {
	ok: boolean
	message: string
	provider: AiProvider
	model: string
}
