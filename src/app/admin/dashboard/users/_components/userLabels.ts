import type { AssignableRole, AssignableStatus, UserRole, UserStatus } from "@/types/user"

/**
 * How accounts are named and coloured across the Users screens.
 *
 * One file so the list and the detail page cannot drift apart — a customer
 * described as "Suspended" on one and "Blocked" on the other is a support call.
 */

export interface Chip {
	/** A key into the admin catalogue — this module has no locale to resolve one. */
	labelKey: string
	className: string
}

/**
 * Colour carries meaning here.
 *
 * PENDING is the accent because it is the only state that costs the shop money
 * by sitting there: a pending dealer is quoted retail prices (R5b), so every
 * unreviewed day is a day they see the wrong ones. Suspended is amber-ish rather
 * than red — it is reversible and often temporary — while rejected and deleted
 * are the states nobody is coming back from without a decision.
 */
export const STATUS_CHIP: Record<UserStatus, Chip> = {
	ACTIVE: { labelKey: "userStatusActive", className: "border-transparent bg-positive-soft text-positive" },
	PENDING: {
		labelKey: "userStatusPending",
		className: "border-transparent bg-accent-soft-strong text-primary",
	},
	SUSPENDED: {
		labelKey: "userStatusSuspended",
		className: "border-transparent bg-accent-soft text-accent-foreground",
	},
	DRAFT: { labelKey: "userStatusDraft", className: "border-transparent bg-muted text-muted-foreground" },
	REJECTED: { labelKey: "userStatusRejected", className: "border-transparent bg-negative-soft text-negative" },
}

/** GUEST is never stored on a row — it exists so pricing has a role for anonymous requests. */
/** Keys, resolved at render. */
export const ROLE_LABEL: Record<UserRole, string> = {
	GUEST: "userRoleGuest",
	B2C: "userRoleB2C",
	RESELLER: "userRoleReseller",
	SHOP_MANAGER: "userRoleShopManager",
	ADMIN: "userRoleAdmin",
}

export const ASSIGNABLE_ROLES: AssignableRole[] = ["B2C", "RESELLER", "SHOP_MANAGER", "ADMIN"]

/** What each hand-set status does, in the words the person clicking it needs. */
export const STATUS_ACTIONS: {
	value: AssignableStatus
	labelKey: string
	hintKey: string
}[] = [
	{ value: "ACTIVE", labelKey: "userStatusActive", hintKey: "statusHintActive" },
	{ value: "SUSPENDED", labelKey: "userStatusSuspended", hintKey: "statusHintSuspended" },
	{ value: "DRAFT", labelKey: "userStatusDraft", hintKey: "statusHintDraft" },
]

/** Roles whose accounts only an admin may act on. */
export const STAFF_ROLES: UserRole[] = ["ADMIN", "SHOP_MANAGER"]

export const nameOf = (user: {
	firstName: string | null
	lastName: string | null
	company: string | null
	email: string
}): string =>
	[user.firstName, user.lastName].filter(Boolean).join(" ") || user.company || user.email

/** Dates in the reader’s language — this was pinned to en-GB. */
export const formatDate = (value: string | null, locale = "de"): string =>
	value
		? new Date(value).toLocaleDateString(locale, {
				day: "2-digit",
				month: "short",
				year: "numeric",
			})
		: "—"

export const formatDateTime = (value: string | null, locale = "de"): string =>
	value
		? new Date(value).toLocaleString(locale, {
				day: "2-digit",
				month: "short",
				year: "numeric",
				hour: "2-digit",
				minute: "2-digit",
			})
		: "—"
