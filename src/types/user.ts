/**
 * One account, whatever its role.
 *
 * Retail customers, dealers and staff are the same row on the API and always
 * were. This file replaces the old customer/dealer split, which only ever meant
 * two places to look for one person.
 */

export type UserRole = "GUEST" | "B2C" | "RESELLER" | "SHOP_MANAGER" | "ADMIN"

export type UserStatus = "ACTIVE" | "PENDING" | "REJECTED" | "SUSPENDED" | "DRAFT"

/** GUEST is unreachable: it exists so pricing has a role for anonymous requests. */
export type AssignableRole = Exclude<UserRole, "GUEST">

/**
 * What staff may set by hand. PENDING and REJECTED are absent because those
 * belong to the dealer decision, which emails the applicant.
 */
export type AssignableStatus = Extract<UserStatus, "ACTIVE" | "SUSPENDED" | "DRAFT">

/** Mirrors the backend's `AdminUser` — the staff view, wider than a customer's own. */
export interface AdminUser {
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
	updatedAt: string
	/** Set means deleted-but-recoverable. Absent from every list unless asked for. */
	deletedAt: string | null
	lastLoginAt: string | null
	termsAcceptedAt: string | null
	vatValidated: boolean
}

/**
 * The dealer application, as the user detail endpoint returns it — the raw row,
 * flat, not the nested shape the old /admin/b2b view built.
 */
export interface DealerApplicationRow {
	id: string
	userId: string
	companyName: string
	vatNumber: string | null
	registerNumber: string | null
	foundingDate: string | null
	website: string | null
	businessType: string | null
	expectedVolume: string | null
	psiMember: boolean
	street: string
	street2: string | null
	postcode: string
	city: string
	countryCode: string
	salutation: string | null
	firstName: string
	lastName: string
	phone: string | null
	message: string | null
	reviewedAt: string | null
	reviewedBy: string | null
	reviewNote: string | null
	createdAt: string
}

export interface AdminUserDetail extends AdminUser {
	/** Null for anyone who never applied as a dealer. */
	application: DealerApplicationRow | null
	counts: { orders: number; quotes: number; addresses: number }
}

export interface UserListParams {
	status?: UserStatus
	role?: UserRole
	search?: string
	/** True asks for the recycle bin instead of the live list. */
	deleted?: boolean
	page?: number
	limit?: number
}

export interface UserListMeta {
	page: number
	limit: number
	total: number
	totalPages: number
	/** Per-status totals for the tabs, ignoring the status filter itself. */
	counts: Partial<Record<UserStatus, number>>
}
