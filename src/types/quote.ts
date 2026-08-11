/** Mirrors the backend quote module's `quoteView()`. */

export type QuoteStatus =
	/** Submitted, nobody has priced it yet. */
	| "OPEN"
	/** Staff have quoted a price and replied. */
	| "ANSWERED"
	/** The customer accepted — ready to become an order. */
	| "ACCEPTED"
	| "DECLINED"
	| "EXPIRED"
	| "CLOSED"

export type QuoteMessageAuthor = "CUSTOMER" | "STAFF" | string

export interface QuoteItem {
	id: string
	sku: string
	name: string
	attributes: unknown
	quantity: number
	/** The MOQ as it stood when the request was submitted, not today's. */
	moq: number
	note: string | null
	/** Frozen at submission. assetId goes null if the upload is deleted. */
	files: { id: string; assetId: string | null; name: string }[]
	quotedUnitPrice: string | null
	quotedLineTotal: string | null
}

export interface QuoteMessage {
	id: string
	author: QuoteMessageAuthor
	body: string
	/** Staff-only note — filtered out of the customer's view by the API. */
	isInternal?: boolean
	createdAt: string
}

export interface Quote {
	id: string
	quoteNumber: string
	status: QuoteStatus
	locale: string
	title: string
	message: string | null
	contact: {
		name: string | null
		email: string | null
		phone: string | null
		company: string | null
	}
	expiresAt: string | null
	quotedSubtotal: string | null
	currency: string | null
	submittedAt: string
	answeredAt: string | null
	items: QuoteItem[]
	messages: QuoteMessage[]
}

export interface AdminQuoteListParams {
	status?: QuoteStatus
	search?: string
	page?: number
	limit?: number
}

export interface QuoteUpdatePayload {
	status?: QuoteStatus
	expiresAt?: string | null
	/** Pricing the lines is the whole job — the subtotal is derived server-side. */
	items?: { id: string; quotedUnitPrice?: string | null }[]
}

export interface QuoteReplyPayload {
	body: string
	isInternal: boolean
}
