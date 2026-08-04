import type { DealerStatus } from "@/types/dealer"

export interface Chip {
	label: string
	className: string
}

/**
 * PENDING is orange for the same reason an unanswered quote is: it is the only
 * state on this screen that costs the shop money by sitting there. A pending
 * dealer sees guest prices (R5b), so every day unreviewed is a day they are
 * quoted retail.
 */
export const DEALER_STATUS: Record<DealerStatus, Chip> = {
	PENDING: {
		label: "Awaiting review",
		className: "border-transparent bg-accent-soft-strong text-primary",
	},
	ACTIVE: { label: "Approved", className: "border-transparent bg-positive-soft text-positive" },
	REJECTED: { label: "Rejected", className: "border-transparent bg-negative-soft text-negative" },
}

export const DEALER_STATUS_OPTIONS = (Object.keys(DEALER_STATUS) as DealerStatus[]).map(
	(value) => ({ value, label: DEALER_STATUS[value].label })
)

export const formatDate = (value: string) =>
	new Date(value).toLocaleDateString("en-GB", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	})
