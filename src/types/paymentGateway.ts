/** Mirrors the backend paymentGateway module's `view()`. */

export type GatewayProvider = "STRIPE" | "PAYPAL"
export type GatewayMode = "TEST" | "LIVE"

export interface CredentialField {
	key: string
	label: string
	/** False for values designed to be public, like a publishable key. */
	secret: boolean
	required: boolean
	placeholder: string
	/** Where to find it, in the provider's own words. */
	help: string
}

export interface ProviderMethod {
	code: string
	label: string
	/** True when the customer leaves the site to complete this method. */
	redirects: boolean
	description: string
}

/**
 * What is stored, without what is stored.
 *
 * The API never returns a key — only whether one is set and a masked preview,
 * so an admin can tell `sk_live_••••4242` from `sk_test_••••9001` without the
 * screen ever holding something usable.
 */
export interface CredentialState {
	isSet: boolean
	preview: string | null
}

export interface PaymentGatewayView {
	provider: GatewayProvider
	label: string
	dashboardUrl: string
	isActive: boolean
	mode: GatewayMode
	enabledMethods: string[]
	fields: CredentialField[]
	methods: ProviderMethod[]
	/** Paste this into the provider's dashboard to create the webhook. */
	webhookUrl: string
	credentials: Record<GatewayMode, Record<string, CredentialState>>
	lastTest: {
		at: string
		mode: GatewayMode
		succeeded: boolean | null
		message: string | null
	} | null
	updatedAt: string
}

export interface ConnectionTestResult {
	ok: boolean
	message: string
	accountName?: string
	livemode?: boolean
}
