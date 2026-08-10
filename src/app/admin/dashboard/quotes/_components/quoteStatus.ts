import type { QuoteStatus } from "@/types/quote"

export interface Chip {
	label: string
	className: string
}

/**
 * Same colour rule as orders: green is settled, orange is waiting on us, grey
 * is out of play. OPEN is orange because an unanswered quote is the one thing
 * on this screen that costs money by sitting there.
 */
export const QUOTE_STATUS: Record<QuoteStatus, Chip> = {
	OPEN: { label: "Open", className: "border-transparent bg-accent-soft-strong text-primary" },
	ANSWERED: { label: "Answered", className: "border-transparent bg-muted text-foreground" },
	ACCEPTED: { label: "Accepted", className: "border-transparent bg-positive-soft text-positive" },
	DECLINED: { label: "Declined", className: "text-muted-foreground" },
	EXPIRED: { label: "Expired", className: "text-muted-foreground" },
	CLOSED: { label: "Closed", className: "text-muted-foreground" },
}

export const QUOTE_STATUS_OPTIONS = (Object.keys(QUOTE_STATUS) as QuoteStatus[]).map((value) => ({
	value,
	label: QUOTE_STATUS[value].label,
}))

/*
 * Re-exported, not re-implemented.
 *
 * This used to be its own Intl formatter pinned to en-GB and EUR, which meant
 * the orders table ignored the shop's currency settings entirely — a separator
 * changed in Settings changed everything except the screens staff look at
 * most.
 */
export { formatMoney } from "@/lib/money"

export const formatDate = (value: string) =>
	new Date(value).toLocaleDateString("en-GB", {
		day: "2-digit",
		month: "short",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	})

/** True once every line carries a price — the precondition for answering. */
export const isFullyPriced = (items: { quotedUnitPrice: string | null }[]) =>
	items.length > 0 && items.every((i) => i.quotedUnitPrice !== null)
