/**
 * Cache tags, one per API resource. A mutation invalidates the tags it affects
 * and RTK Query refetches only those queries.
 *
 * Note there is no `price` tag: prices are never cached independently of the
 * thing they belong to, because the same product URL returns a different price
 * per role (guest / B2C / active Reseller). Caching a price on its own is how
 * a guest ends up seeing wholesale rates — spec risk #1.
 */
export enum tagTypes {
	auth = "auth",
	user = "user",
	account = "account",
	address = "address",
	b2b = "b2b",

	category = "category",
	product = "product",
	attribute = "attribute",
	media = "media",
	mediaFolder = "mediaFolder",

	cart = "cart",
	checkout = "checkout",
	order = "order",
	quote = "quote",
	wishlist = "wishlist",

	tax = "tax",
	shipping = "shipping",
	payment = "payment",
	setting = "setting",
	email = "email",

	contact = "contact",
	newsletter = "newsletter",
}

export const tagTypesList = Object.values(tagTypes)
