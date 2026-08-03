/** Mirrors the backend tax module's `view()` and its write payloads. */

export interface TaxTranslation {
	locale: string
	name: string
}

export interface TaxRate {
	id: string
	/** ISO 3166-1 alpha-2, never a display name (§10.4 risk #5). */
	countryCode: string
	/** Narrows the rate to a region within the country. */
	state: string | null
	/** The label that appears on the invoice line, e.g. "Steuer". */
	name: string
	/** A percentage — Decimal(9,4), carried as a string so no digit is lost. */
	rate: string
	appliesToShipping: boolean
	/** Lower runs first when several rates match. */
	priority: number
	/** EU reverse charge: a validated VAT ID in this country pays 0%. */
	reverseChargeWithVatId: boolean
	isActive: boolean
}

export interface TaxClass {
	id: string
	code: string
	isDefault: boolean
	sortOrder: number
	/** Resolved for the requesting locale; `translations` carries all of them. */
	name: string
	translations: TaxTranslation[]
	rates: TaxRate[]
}

export interface TaxClassPayload {
	code?: string
	isDefault?: boolean
	sortOrder?: number
	translations?: TaxTranslation[]
}

export interface TaxRatePayload {
	taxClassId?: string
	countryCode?: string
	state?: string | null
	name?: string
	rate?: string
	appliesToShipping?: boolean
	priority?: number
	reverseChargeWithVatId?: boolean
	isActive?: boolean
}
