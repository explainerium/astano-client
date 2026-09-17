/** Mirrors the backend ai module. */

export type AiProvider = "anthropic" | "openai"

/** Which field is being written, which decides the shape of the answer. */
export type AiKind =
	| "product"
	| "productShort"
	| "category"
	| "content"
	/** The blue line in a search result. */
	| "metaTitle"
	/** The two lines under it. */
	| "metaDescription"

/**
 * Overrides the kind's usual shape.
 *
 * The same kind can sit in two different boxes — a category description is rich
 * text on a product and a plain textarea on a category — so the caller says
 * which it is filling rather than the kind carrying a second meaning.
 */
export type AiFormat = "html" | "text"

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
	/** Defaults to whatever the kind usually returns. */
	format?: AiFormat
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
