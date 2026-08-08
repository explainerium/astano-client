/**
 * The shopper-facing product and category shapes — `toPublicProduct()` on the
 * server.
 *
 * Note what is **not** here: `kind`. It is an admin-only dashboard label and
 * the API deliberately never serialises it to a public payload (§1B decision
 * 4b). Prices arrive already resolved for the requesting role and quantity, so
 * nothing on this side ever computes one — that is spec risk #1.
 */

import type { BankAccount } from "./payment"

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
	/** The variant a listing card acts on — wishlist, quick view. */
	defaultVariantId: string | null
	/** The "from X" range shown on listings. Null when quote-only. */
	priceFrom: string | null
	priceTo: string | null
}

/** One purchasable line. The API resolves its price for the caller's role. */
export interface PublicVariant {
	id: string
	sku: string | null
	isDefault: boolean
	description: string | null
	/** Already resolved against the product's MOQ — use this, not product.moq. */
	moq: number
	inStock: boolean
	/** Null when the variant does not manage stock. */
	stock: number | null
	weightKg: string | null
	/** Printed in the "Additional information" tab. Null means unset, not zero. */
	lengthCm: string | null
	widthCm: string | null
	heightCm: string | null
	image: PublicImage | null
	/** `label` is the value ("Ø 60 mm"), `name` the attribute ("Diameter"). */
	attributes: { id: string; label: string; name: string }[]
	/** Null when quote-only, or when this role has no price at all. */
	unitPrice: string | null
	/** The struck-through price when onSale. */
	listPrice: string | null
	onSale: boolean
	lineTotal: string | null
	/** The "buy more, save more" ladder for the role that actually resolved. */
	tiers: { minQuantity: number; unitPrice: string | null }[]
}

/** An add-on sold alongside a main product (§4.6). */
export interface PublicOption {
	id: string
	name: string
	slug: string
	groupLabel: string | null
	preselected: boolean
	moq: number
	/** Options start at their own MOQ, not at 1. */
	startQuantity: number
	discountPercent: string | null
	image: PublicImage | null
	unitPrice: string | null
	/**
	 * The option's own quantity ladder, already priced for this visitor.
	 *
	 * An option is a product bought in its own quantity — engraving 500 cutters
	 * is not the same unit price as engraving 50 — so it carries its own rungs
	 * rather than inheriting the parent's.
	 */
	tiers: { minQuantity: number; unitPrice: string | null }[]
}

/**
 * What /products/:slug adds on top of the listing shape.
 *
 * The list endpoint happens to return these too, but nothing on a listing
 * should depend on that — the narrower type keeps card code honest.
 */
export interface PublicProductDetail extends PublicProduct {
	description: string | null
	metaTitle: string | null
	metaDescription: string | null
	variants: PublicVariant[]
	options: PublicOption[]
}

/** Why a basket cannot proceed. The API sends codes, not sentences. */
export type BasketIssue = "BELOW_MOQ" | "OUT_OF_STOCK"

export interface CartLine {
	id: string
	variantId: string
	productId: string
	sku: string | null
	name: string
	slug: string
	attributes: { id: string; label: string }[]
	image: { id: string; url: string } | null
	quantity: number
	moq: number
	belowMoq: boolean
	inStock: boolean
	availableStock: number | null
	unitPrice: string | null
	listPrice: string | null
	onSale: boolean
	lineTotal: string | null
	/** Add-ons attached to this line (§4.6). Never present on an option itself. */
	options?: Omit<CartLine, "options">[]
}

export interface CartView {
	id: string
	items: CartLine[]
	/** Units across every line; `lineCount` is the number of lines. */
	itemCount: number
	lineCount: number
	subtotal: string
	currency: string
	issues: BasketIssue[]
	checkoutReady: boolean
}

/**
 * The inquiry basket. Deliberately priceless — a quote is a request, and the
 * figures only exist once staff answer it (R2).
 */
export interface QuoteBasketLine {
	id: string
	variantId: string
	sku: string | null
	name: string
	slug: string
	attributes: { id: string; label: string }[]
	image: { id: string; url: string } | null
	quantity: number
	note: string | null
	moq: number
	belowMoq: boolean
	quoteOnly: boolean
}

export interface QuoteBasketView {
	id: string
	items: QuoteBasketLine[]
	itemCount: number
	lineCount: number
	issues: BasketIssue[]
	submitReady: boolean
}

export interface QuoteSubmission {
	title: string
	message?: string
	contactName?: string
	contactEmail?: string
	contactPhone?: string
	contactCompany?: string
}

export interface CheckoutAddress {
	firstName: string
	lastName: string
	company?: string
	street1: string
	street2?: string
	city: string
	state?: string
	postcode: string
	/** ISO 3166-1 alpha-2. Never a display name — tax and shipping key off this. */
	countryCode: string
	phone?: string
	email?: string
}

export interface SavedAddress extends CheckoutAddress {
	id: string
	label: string | null
	isDefaultBilling: boolean
	isDefaultShipping: boolean
}

export interface TaxLine {
	name: string
	ratePercent: string
	taxableBase: string
	amount: string
}

export interface ShippingOption {
	methodId: string
	code: string
	name: string
	cost: string
	taxable: boolean
	unavailableReason?: "NO_MATCHING_BAND" | "BELOW_FREE_THRESHOLD" | "NOT_CONFIGURED"
}

export interface CheckoutPaymentMethod {
	id: string
	code: string
	title: string
	description: string | null
	eligible: boolean
	/** e.g. NOT_ENOUGH_ORDER_HISTORY — why this method is closed to this customer. */
	reason?: string
}

/**
 * Totals for a prospective order.
 *
 * Recomputed by the server for every address and delivery method, because
 * shipping is taxable: choosing a method changes the tax, not just the
 * shipping line.
 */
export interface CheckoutPreview {
	subtotal: string
	shippingTotal: string
	taxTotal: string
	grandTotal: string
	totalWeightKg: string
	currency: string
	/** R10: a rate matched but was zeroed against a validated EU VAT ID. */
	reverseCharged: boolean
	/** No rate configured for this destination at all — 0% by omission, not by rule. */
	taxUnconfigured: boolean
	taxLines: TaxLine[]
	/**
	 * False until a delivery country is known.
	 *
	 * Distinguishes "you have not told us where yet" from "we do not deliver
	 * there" — both leave shippingOptions empty, and only one of them warrants a
	 * warning.
	 */
	hasDestination: boolean
	shippingOptions: ShippingOption[]
	paymentMethods: CheckoutPaymentMethod[]
}

export interface PlaceOrderPayload {
	billingAddress: CheckoutAddress
	shippingAddress?: CheckoutAddress
	shippingMethodId: string
	paymentMethodId: string
	customerNote?: string
	vatNumber?: string
}

export interface PlacedOrder {
	id: string
	orderNumber: string
	status: string
	paymentStatus: string
	currency: string
	subtotal: string
	shippingTotal: string
	taxTotal: string
	discountTotal: string
	grandTotal: string
	shippingMethod: { code: string; title: string } | null
	paymentMethod: {
		code: string
		title: string
		instructions?: string | null
		/** Frozen on the order at checkout — see Order.paymentAccounts. */
		bankAccounts?: BankAccount[]
	} | null
	reverseCharged: boolean
	customerNote: string | null
	placedAt: string
	addresses: { billing: CheckoutAddress; shipping: CheckoutAddress }
	taxLines: TaxLine[]
}

export interface AccountProfile {
	id: string
	email: string
	role: string
	status: string
	salutation: string | null
	firstName: string | null
	lastName: string | null
	company: string | null
	phone: string | null
	vatNumber: string | null
	foundingDate: string | null
	psiMember: boolean
	locale: string
	createdAt: string
}

export interface OrderItem {
	id: string
	sku: string | null
	name: string
	attributes: { id: string; label: string }[]
	quantity: number
	unitPrice: string | null
	lineTotal: string | null
	options?: Omit<OrderItem, "options">[]
}

/** `GET /orders` returns whole orders, not summaries — the list has everything. */
export interface CustomerOrder extends PlacedOrder {
	items: OrderItem[]
	paymentStatus: string
	paidAt: string | null
}

export interface QuoteMessage {
	id: string
	author: "CUSTOMER" | "STAFF"
	body: string
	createdAt: string
}

export interface QuoteItem {
	id: string
	sku: string | null
	name: string
	attributes: { id: string; label: string }[]
	quantity: number
	moq: number
	note: string | null
	/** Null until staff have answered — that is the whole point of a quote. */
	quotedUnitPrice: string | null
	quotedLineTotal: string | null
}

export interface CustomerQuote {
	id: string
	quoteNumber: string
	status: "OPEN" | "ANSWERED" | "ACCEPTED" | "DECLINED" | "EXPIRED" | "CLOSED"
	locale: string
	title: string
	message: string | null
	contact: { name: string | null; email: string | null; phone: string | null; company: string | null }
	expiresAt: string | null
	quotedSubtotal: string | null
	currency: string | null
	submittedAt: string
	answeredAt: string | null
	items: QuoteItem[]
	messages: QuoteMessage[]
}

export interface WishlistItem {
	id: string
	variantId: string
	productId: string
	sku: string | null
	name: string
	slug: string
	image: { id: string; url: string } | null
	quoteOnly: boolean
	moq: number
	inStock: boolean
	/** False once the product is unpublished or the variant disabled. */
	available: boolean
	unitPrice: string | null
	addedAt: string
}

export interface WishlistView {
	id: string
	itemCount: number
	items: WishlistItem[]
}

/**
 * A payment method as the shop offers it, eligible or not.
 *
 * Everything but `reason` is always present. An earlier API returned only an id
 * and a code for the ineligible ones — hence the optional fields this used to
 * carry — which left the checkout unable to name a method it was meant to show
 * greyed out.
 */
export interface AvailablePaymentMethod {
	id: string
	code: string
	type: string
	title: string
	description: string | null
	instructions: string | null
	/** Bank details for a transfer. Empty for every other kind. */
	bankAccounts: BankAccount[]
	eligible: boolean
	/** Why not, when not — e.g. AWAITING_COUNTRY, NOT_ENOUGH_ORDER_HISTORY. */
	reason?: string
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

/** What the archive's price filter needs beyond the rows themselves. */
export interface ProductListMeta {
	page: number
	limit: number
	total: number
	totalPages: number
	/** The cheapest and dearest resolved price in the matching set. */
	priceBounds: { min: number; max: number } | null
}

export interface PublicProductListParams {
	category?: string
	search?: string
	quantity?: number
	page?: number
	limit?: number
	minPrice?: number
	maxPrice?: number
	sort?: "default" | "newest" | "name" | "price_asc" | "price_desc"
}
