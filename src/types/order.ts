/** Mirrors the backend order module's `view()`. Money arrives pre-formatted to 2dp. */

export type OrderStatus =
	/** Placed, awaiting payment — bank transfer sits here. */
	| "PENDING"
	/** Paid or approved for fulfilment. */
	| "PROCESSING"
	/** Paused — stock, a query, a manual check. */
	| "ON_HOLD"
	| "COMPLETED"
	| "CANCELLED"
	| "REFUNDED"
	| "FAILED"

export type PaymentStatus = "UNPAID" | "PAID" | "PARTIALLY_REFUNDED" | "REFUNDED" | "FAILED"

export interface OrderAddress {
	firstName: string | null
	lastName: string | null
	company: string | null
	street1: string | null
	street2: string | null
	city: string | null
	state: string | null
	postcode: string | null
	countryCode: string | null
	phone: string | null
	email: string | null
}

/**
 * A design file frozen onto an order line.
 *
 * `assetId` is null once the upload is deleted; the name still records what was
 * sent, because a blank where a drawing used to be is the one thing production
 * must never see.
 */
export interface OrderLineFile {
	id: string
	assetId: string | null
	name: string
}

export interface OrderOptionLine {
	id: string
	sku: string
	name: string
	quantity: number
	unitPrice: string
	lineTotal: string
	/**
	 * An option's own drawings.
	 *
	 * Options carry them as much as the lines above them do — an engraving is
	 * the line the file belongs to, the cutter is the blank — and this type not
	 * having the field is why the dashboard showed none of them.
	 */
	files: OrderLineFile[]
}

export interface OrderItem {
	id: string
	sku: string
	name: string
	attributes: unknown
	quantity: number
	unitPrice: string
	lineTotal: string
	/** The design files this line is made from, frozen at placement. */
	files: OrderLineFile[]
	/** Configurator lines, priced and counted separately (§4.6). */
	options: OrderOptionLine[]
}

export interface OrderTaxLine {
	name: string
	ratePercent: string
	taxableBase: string
	amount: string
}

export interface OrderStatusChange {
	from: OrderStatus | null
	to: OrderStatus
	note: string | null
	at: string
}

export interface Order {
	id: string
	orderNumber: string
	status: OrderStatus
	paymentStatus: PaymentStatus
	locale: string
	currency: string
	subtotal: string
	shippingTotal: string
	taxTotal: string
	discountTotal: string
	grandTotal: string
	totalWeightKg: string | null
	shippingMethod: { code: string | null; title: string } | null
	paymentMethod: { code: string | null; title: string; instructions: string | null } | null
	vatNumber: string | null
	/** EU reverse charge applied — tax lines are recorded at 0 (R10). */
	reverseCharged: boolean
	customerNote: string | null
	/** Staff-only; never present on a customer's own view of the order. */
	internalNote?: string | null
	placedAt: string
	paidAt: string | null
	addresses: { billing?: OrderAddress; shipping?: OrderAddress }
	items: OrderItem[]
	taxLines: OrderTaxLine[]
	statusHistory?: OrderStatusChange[]
}

export interface AdminOrderListParams {
	status?: OrderStatus
	search?: string
	page?: number
	limit?: number
}

export interface OrderStatusPayload {
	status: OrderStatus
	paymentStatus?: PaymentStatus
	note?: string
}

/**
 * A note staff added after the order was placed.
 *
 * Distinct from `customerNote`, which is what the customer typed at checkout,
 * and from `internalNote`, which is a single field overwritten in place.
 */
export interface OrderNote {
	id: string
	authorName: string
	body: string
	/** True means it was emailed to the customer when it was added. */
	isCustomerVisible: boolean
	createdAt: string
}

export interface OrderNotePayload {
	body: string
	isCustomerVisible: boolean
}
