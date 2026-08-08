import type { AssignableRole, AssignableStatus, UserRole, UserStatus } from "@/types/user"

/**
 * How accounts are named and coloured across the Users screens.
 *
 * One file so the list and the detail page cannot drift apart — a customer
 * described as "Suspended" on one and "Blocked" on the other is a support call.
 */

export interface Chip {
	label: string
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
	ACTIVE: { label: "Active", className: "border-transparent bg-positive-soft text-positive" },
	PENDING: {
		label: "Awaiting review",
		className: "border-transparent bg-accent-soft-strong text-primary",
	},
	SUSPENDED: {
		label: "Suspended",
		className: "border-transparent bg-accent-soft text-accent-foreground",
	},
	DRAFT: { label: "Draft", className: "border-transparent bg-muted text-muted-foreground" },
	REJECTED: { label: "Rejected", className: "border-transparent bg-negative-soft text-negative" },
}

/** GUEST is never stored on a row — it exists so pricing has a role for anonymous requests. */
export const ROLE_LABEL: Record<UserRole, string> = {
	GUEST: "Guest",
	B2C: "Retail",
	RESELLER: "Dealer",
	SHOP_MANAGER: "Shop manager",
	ADMIN: "Admin",
}

export const ASSIGNABLE_ROLES: AssignableRole[] = ["B2C", "RESELLER", "SHOP_MANAGER", "ADMIN"]

/** What each hand-set status does, in the words the person clicking it needs. */
export const STATUS_ACTIONS: { value: AssignableStatus; label: string; hint: string }[] = [
	{
		value: "ACTIVE",
		label: "Active",
		hint: "Can sign in, order, and — if a dealer — see wholesale prices.",
	},
	{
		value: "SUSPENDED",
		label: "Suspended",
		hint: "Keeps their account and history but cannot order. A dealer pays guest prices.",
	},
	{
		value: "DRAFT",
		label: "Draft",
		hint: "Prepared but not live. Sign-in is refused until you activate it.",
	},
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

export const formatDate = (value: string | null): string =>
	value
		? new Date(value).toLocaleDateString("en-GB", {
				day: "2-digit",
				month: "short",
				year: "numeric",
			})
		: "—"

export const formatDateTime = (value: string | null): string =>
	value
		? new Date(value).toLocaleString("en-GB", {
				day: "2-digit",
				month: "short",
				year: "numeric",
				hour: "2-digit",
				minute: "2-digit",
			})
		: "—"
