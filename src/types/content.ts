/**
 * The dashboard's view of what the shop may edit on its own pages.
 *
 * Mirrors backend/src/app/modules/content/contentRegistry.ts. The registry is
 * sent with every read rather than duplicated here, so a key added there
 * appears on the screen with no change on this side — the same arrangement the
 * settings and email screens use.
 */

export type ContentType =
	| "text"
	| "textarea"
	| "richtext"
	| "image"
	/**
	 * A list the shop may lengthen and shorten, stored as one JSON value.
	 *
	 * Whole rather than per item, because the merge on the storefront replaces
	 * what shipped and can only replace a key the catalogue already has: a tenth
	 * FAQ question stored as its own key would land on one nothing reads.
	 */
	| "list"

export type ContentGroup =
	| "home"
	| "about"
	| "custom"
	| "quality"
	| "dealers"
	| "faq"
	| "contact"
	| "payment"
	| "shell"
	| "auth"
	| "product"

export interface ContentDefinition {
	group: ContentGroup
	section: string
	label: string
	help?: string
	type: ContentType
	/** Placeholders the shipped copy interpolates, without braces. */
	vars?: string[]
	/** For `list`: what one item is made of, in the order shown. */
	fields?: { name: string; label: string; type: "text" | "textarea" }[]
}

export interface ContentGroupDefinition {
	id: ContentGroup
	title: string
	blurb: string
}

/** A picture, as the editor needs to show and change it. */
export interface ContentMediaValue {
	assetId: string | null
	name: string | null
	/** Null while the asset is private, or once it has been deleted. */
	url: string | null
}

export interface ContentResponse {
	/** locale → key → the text stored for it. Absent keys use the shipped copy. */
	entries: Record<string, Record<string, string>>
	media: Record<string, ContentMediaValue>
	definitions: Record<string, ContentDefinition>
	groups: ContentGroupDefinition[]
	/** `group/section` -> where that section sits on the site. */
	sections: Record<string, string>
}

export interface ContentPayload {
	entries?: { key: string; locale: string; value: string }[]
	media?: { key: string; assetId: string | null }[]
}

/** One long document, as the shop has rewritten it. */
export interface ContentPage {
	title: string
	bodyHtml: string
}

export interface ContentPageDefinition {
	slug: string
	label: string
	blurb: string
}

export interface ContentPagesResponse {
	/** locale → slug → the shop's version. Absent slugs use the shipped file. */
	pages: Record<string, Record<string, ContentPage>>
	definitions: ContentPageDefinition[]
}

export interface ContentPagesPayload {
	pages: { slug: string; locale: string; title: string; bodyHtml: string }[]
}
