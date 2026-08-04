/** Mirrors the backend payment module's `view()` and its write payloads. */

export type PaymentMethodType = "BANK_TRANSFER" | "INVOICE" | "CASH_ON_DELIVERY" | "OTHER"

export type PaymentRole = "GUEST" | "B2C" | "RESELLER" | "SHOP_MANAGER" | "ADMIN"

export interface PaymentTranslation {
	locale: string
	title: string
	description?: string | null
	/** Shown after ordering and in the confirmation email — bank details go here. */
	instructions?: string | null
}

/**
 * Who may use this method. Every field narrows; an empty list means "no
 * restriction", not "nobody".
 */
export interface PaymentRules {
	allowedCountries: string[]
	allowedRoles: PaymentRole[]
	requiresLogin: boolean
	minCompletedOrders: number
	minOrderTotal: string | null
	maxOrderTotal: string | null
	requiresValidatedVatId: boolean
}

export interface PaymentMethod {
	id: string
	code: string
	type: PaymentMethodType
	isActive: boolean
	sortOrder: number
	/** Resolved for the requesting locale; `translations` carries all of them. */
	title: string
	translations: PaymentTranslation[]
	rules: PaymentRules
	/**
	 * Method-specific settings. Deliberately not edited in the admin: bank
	 * details belong in the localized `instructions`, which the customer
	 * actually reads, not in a raw blob that never reaches them.
	 */
	config: unknown
}

export interface PaymentMethodPayload {
	code?: string
	type?: PaymentMethodType
	isActive?: boolean
	sortOrder?: number
	allowedCountries?: string[]
	allowedRoles?: PaymentRole[]
	requiresLogin?: boolean
	minCompletedOrders?: number
	minOrderTotal?: string | null
	maxOrderTotal?: string | null
	requiresValidatedVatId?: boolean
	translations?: PaymentTranslation[]
}
