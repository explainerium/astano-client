/**
 * Shapes shared with the API. These mirror backend/src/shared/sendResponse.ts
 * and backend/src/app/modules/auth/auth.interface.ts — if either changes, this
 * file changes with it.
 */

/** Every API response is wrapped in this envelope. */
export interface IApiResponse<T = unknown> {
	success: boolean
	statusCode: number
	message: string
	meta?: IMeta
	data?: T
}

export interface IMeta {
	page: number
	limit: number
	total: number
	totalPages: number
}

/** What the axios response interceptor hands back on success. */
export interface ResponseSuccessType<T = unknown> {
	data: T
	meta?: IMeta
}

/** What the axios response interceptor rejects with on failure. */
export interface IGenericErrorResponse {
	statusCode: number
	message: string
	errorMessages?: string
}

// ─── Auth ────────────────────────────────────────────────────────────────────

/**
 * GUEST is never stored on a user row. It exists because pricing needs a role
 * for anonymous visitors too — guests have their own tier ladder (§4.2).
 */
export type UserRole = "GUEST" | "B2C" | "RESELLER" | "SHOP_MANAGER" | "ADMIN"

/**
 * Separate from role on purpose. A RESELLER can be PENDING while an admin
 * reviews the application, and such an account is priced as a GUEST (R5b).
 */
export type UserStatus = "ACTIVE" | "PENDING" | "REJECTED"

/** Claims carried by the access token. Signed by the API, read-only here. */
export interface AccessTokenPayload {
	sub: string
	role: UserRole
	status: UserStatus
	iat?: number
	exp?: number
}

/** User shape the API returns. Never includes a password hash. */
export interface PublicUser {
	id: string
	email: string
	role: UserRole
	status: UserStatus
	firstName: string | null
	lastName: string | null
	company: string | null
	phone: string | null
	vatNumber: string | null
	locale: string
	createdAt: string
}

export interface AuthResult {
	accessToken: string
	refreshToken: string
	user: PublicUser
}
