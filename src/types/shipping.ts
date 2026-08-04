/** Mirrors the backend shipping module's `view()` and its write payloads. */

export type ShippingMethodType =
	/** Cost looked up from weight bands — how the live shop works (§3.6). */
	| "WEIGHT_BANDED"
	/** One cost per order, whatever the weight. */
	| "FLAT_RATE"
	/** No charge, optionally above an order-value threshold. */
	| "FREE_SHIPPING"
	/** Cost looked up from order-value bands. */
	| "PRICE_BANDED"

export interface ShippingBand {
	id?: string
	/** Decimal(12,4) as a string. Inclusive lower bound. */
	minValue: string
	/** Exclusive upper bound. Null is open-ended — the last rung. */
	maxValue: string | null
	cost: string
}

export interface ShippingZoneTranslation {
	locale: string
	name: string
}

export interface ShippingMethodTranslation {
	locale: string
	name: string
	description: string | null
}

export interface ShippingMethod {
	id: string
	code: string
	type: ShippingMethodType
	/** Resolved for the requesting locale; `translations` carries all of them. */
	name: string
	description: string | null
	translations: ShippingMethodTranslation[]
	flatCost: string | null
	freeAboveSubtotal: string | null
	taxable: boolean
	isActive: boolean
	sortOrder: number
	bands: ShippingBand[]
}

export interface ShippingZone {
	id: string
	code: string
	name: string
	translations: ShippingZoneTranslation[]
	sortOrder: number
	isActive: boolean
	/** ISO codes. A country belongs to exactly one zone — the column is unique. */
	countries: string[]
	methods: ShippingMethod[]
}

export interface ShippingZonePayload {
	code?: string
	sortOrder?: number
	isActive?: boolean
	countries?: string[]
	translations?: ShippingZoneTranslation[]
}

export interface ShippingMethodPayload {
	zoneId?: string
	code?: string
	type?: ShippingMethodType
	flatCost?: string | null
	freeAboveSubtotal?: string | null
	taxable?: boolean
	isActive?: boolean
	sortOrder?: number
	translations?: { locale: string; name: string; description?: string }[]
	/** Supplying bands replaces the whole ladder — it is edited as a unit. */
	bands?: { minValue: string; maxValue?: string | null; cost: string }[]
}
