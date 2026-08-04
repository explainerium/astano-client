/** Contact messages and newsletter subscribers — the two lightest back-office lists. */

export interface ContactMessage {
	id: string
	name: string
	email: string
	phone: string | null
	company: string | null
	subject: string | null
	message: string
	locale: string
	userId: string | null
	ipAddress: string | null
	/** Null until someone marks it dealt with. */
	handledAt: string | null
	handledBy: string | null
	internalNote: string | null
	createdAt: string
}

export interface ContactListParams {
	/** The API takes the string "true"/"false", not a boolean. */
	handled?: "true" | "false"
	page?: number
	limit?: number
}

export type SubscriptionStatus =
	/** Signed up, confirmation email sent, not yet confirmed. */
	| "PENDING"
	| "CONFIRMED"
	| "UNSUBSCRIBED"

export interface NewsletterSubscriber {
	id: string
	email: string
	name: string | null
	status: SubscriptionStatus
	locale: string
	/** Where they signed up — footer, checkout, and so on. */
	source: string | null
	confirmedAt: string | null
	createdAt: string
}

export interface NewsletterListParams {
	status?: SubscriptionStatus
	page?: number
	limit?: number
}
