/**
 * The shopper-facing product and category shapes — `toPublicProduct()` on the
 * server.
 *
 * Note what is **not** here: `kind`. It is an admin-only dashboard label and
 * the API deliberately never serialises it to a public payload (§1B decision
 * 4b). Prices arrive already resolved for the requesting role and quantity, so
 * nothing on this side ever computes one — that is spec risk #1.
 */

export interface PublicImage {
	id: string
	url: string
	width: number | null
	height: number | null
	/** thumb · grid · detail · zoom */
	srcset: Record<string, string>
}

export interface PublicProduct {
	id: string
	slug: string
	name: string
	shortDescription: string | null
	/** "Preis auf Anfrage" — no price at any quantity, for anyone (R2). */
	quoteOnly: boolean
	moq: number
	featuredImage: PublicImage | null
	images: PublicImage[]
	categories: { id: string; name: string; slug: string }[]
	/** The "from X" range shown on listings. Null when quote-only. */
	priceFrom: string | null
	priceTo: string | null
}

export interface PublicCategory {
	id: string
	slug: string
	name: string
	description?: string | null
	image?: PublicImage | null
	productCount?: number
	children?: PublicCategory[]
}

export interface PublicProductListParams {
	category?: string
	search?: string
	quantity?: number
	page?: number
	limit?: number
	sort?: "default" | "newest" | "name" | "price_asc" | "price_desc"
}
