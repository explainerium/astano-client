import type { UserRole } from "@/types"

/**
 * Roles, spelled exactly as the API spells them.
 *
 * Deliberately not lowercased anywhere. Translating case at the boundary means
 * two conventions in the codebase and a guard that silently fails to match when
 * someone forgets which side they are on.
 */
export const ROLE = {
	GUEST: "GUEST",
	B2C: "B2C",
	RESELLER: "RESELLER",
	SHOP_MANAGER: "SHOP_MANAGER",
	ADMIN: "ADMIN",
} as const satisfies Record<UserRole, UserRole>

/** Roles that may reach /admin. */
export const STAFF_ROLES: readonly UserRole[] = [ROLE.ADMIN, ROLE.SHOP_MANAGER]

export const isStaff = (role: UserRole | undefined): boolean =>
	role !== undefined && STAFF_ROLES.includes(role)
