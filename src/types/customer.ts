/** Mirrors the backend's `PublicUser` — never carries passwordHash. */

export type UserRole = "GUEST" | "B2C" | "RESELLER" | "SHOP_MANAGER" | "ADMIN"
export type UserStatus = "ACTIVE" | "PENDING" | "REJECTED"

export interface Customer {
	id: string
	email: string
	role: UserRole
	status: UserStatus
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

export interface CustomerListParams {
	status?: UserStatus
	role?: UserRole
	search?: string
	page?: number
	limit?: number
}

/** GUEST is unreachable here — it exists only so pricing has a role for anonymous requests. */
export type AssignableRole = "B2C" | "RESELLER" | "SHOP_MANAGER" | "ADMIN"
