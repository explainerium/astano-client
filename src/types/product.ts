/** Mirrors the backend product module's `toAdminProduct()` and its write payload. */

export type ProductKind = "MAIN" | "OPTION"
export type ProductStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED"
export type ProductVisibility = "SHOP_AND_SEARCH" | "SHOP_ONLY" | "SEARCH_ONLY" | "HIDDEN"

/** GUEST is a real pricing tier here, not an absence of one (§4.2). */
export type PriceRole = "GUEST" | "B2C" | "RESELLER"

/**
 * Whether tax applies at all — separate from the tax *class*, which decides the
 * rate when it does. WooCommerce's "Tax status".
 */
export type TaxStatus = "TAXABLE" | "SHIPPING_ONLY" | "NONE"
export type TierType = "FIXED_PRICE" | "PERCENTAGE" | "FIXED_AMOUNT"

export interface ProductTranslation {
	locale: string
	name: string
	slug?: string
	shortDescription?: string
	description?: string
	metaTitle?: string
	metaDescription?: string
}

export interface ProductPrice {
	role: PriceRole
	/** Decimal(12,4) — carried as a string so no cent is lost to a float. */
	basePrice: string
	salePrice?: string | null
	saleStartsAt?: string | null
	saleEndsAt?: string | null
}

export interface ProductTier {
	role: PriceRole
	minQuantity: number
	type: TierType
	value: string
}

export interface ProductVariantInput {
	id?: string
	sku: string
	isDefault: boolean
	isActive: boolean
	sortOrder: number
	/** Null inherits the product MOQ; 0 disables the minimum for this variant. */
	moq?: number | null
	manageStock: boolean
	stock: number
	allowBackorder: boolean
	lowStockThreshold?: number | null
	weightKg?: string | null
	lengthCm?: string | null
	widthCm?: string | null
	heightCm?: string | null
	imageAssetId?: string | null
	attributeValueIds: string[]
	prices: ProductPrice[]
	tiers: ProductTier[]
}

/**
 * Mirrors the backend's `variantPatch`: SKU required, everything else optional
 * and with no defaults.
 *
 * A form that only owns some of a variant's fields must send only those. Send
 * `prices: []` and the API deletes the ladder; omit the key and it is left
 * alone. Works for create too, where the server supplies the defaults.
 */
export type ProductVariantPatch = Partial<Omit<ProductVariantInput, "sku">> & {
	sku: string
}

/**
 * A product's attributes, grouped per attribute — the shape the API takes and
 * returns, even though the table stores one row per selected value.
 *
 * `isVisible` and `isVariation` are per product, matching WooCommerce's
 * `_product_attributes`: the same attribute can build variants of one product
 * and be a plain specification on another.
 */
export interface ProductAttributeInput {
	attributeId: string
	attributeValueIds: string[]
	isVisible: boolean
	isVariation: boolean
}

export interface ProductOptionInput {
	optionProductId: string
	sortOrder: number
	groupLabel?: string | null
	preselected: boolean
	discountPercent?: string | null
}

/** What the admin list and detail both return. */
export interface AdminProduct {
	id: string
	kind: ProductKind
	status: ProductStatus
	visibility: ProductVisibility
	quoteEnabled: boolean
	taxStatus: TaxStatus
	moq: number
	sortOrder: number
	/** Resolved for the requesting locale; `translations` carries all of them. */
	name: string
	slug: string
	translations: ProductTranslation[]
	categoryIds: string[]
	featuredAssetId: string | null
	assetIds: string[]
	attributes: ProductAttributeInput[]
	prices: ProductPrice[]
	tiers: ProductTier[]
	variants: (ProductVariantInput & { id: string })[]
	options: (ProductOptionInput & { name: string })[]
	createdAt: string
	updatedAt: string
}

export interface ProductPayload {
	kind?: ProductKind
	status?: ProductStatus
	visibility?: ProductVisibility
	quoteEnabled?: boolean
	taxStatus?: TaxStatus
	moq?: number
	sortOrder?: number
	featuredAssetId?: string | null
	categoryIds?: string[]
	assetIds?: string[]
	attributes?: ProductAttributeInput[]
	translations?: ProductTranslation[]
	variants?: ProductVariantPatch[]
	prices?: ProductPrice[]
	tiers?: ProductTier[]
	options?: ProductOptionInput[]
}

/**
 * Stock is per variant, so this describes the variants as a set: IN_STOCK means
 * at least one is buyable, OUT_OF_STOCK that none is.
 */
export type StockStatus = "IN_STOCK" | "OUT_OF_STOCK" | "ON_BACKORDER"

export interface AdminProductListParams {
	kind?: ProductKind
	status?: ProductStatus
	visibility?: ProductVisibility
	categoryId?: string
	stockStatus?: StockStatus
	search?: string
	page?: number
	limit?: number
}
