import type { QuoteStatus } from "@/types/quote"

export interface Chip {
	/** A key into the admin catalogue. This module has no locale to resolve one. */
	labelKey: string
	className: string
}

/**
 * Same colour rule as orders: green is settled, orange is waiting on us, grey
 * is out of play. OPEN is orange because an unanswered quote is the one thing
 * on this screen that costs money by sitting there.
 */
export const QUOTE_STATUS: Record<QuoteStatus, Chip> = {
	OPEN: { labelKey: "quoteStatusOpen", className: "border-transparent bg-accent-soft-strong text-primary" },
	ANSWERED: { labelKey: "quoteStatusAnswered", className: "border-transparent bg-muted text-foreground" },
	ACCEPTED: { labelKey: "quoteStatusAccepted", className: "border-transparent bg-positive-soft text-positive" },
	DECLINED: { labelKey: "quoteStatusDeclined", className: "text-muted-foreground" },
	EXPIRED: { labelKey: "quoteStatusExpired", className: "text-muted-foreground" },
	CLOSED: { labelKey: "quoteStatusClosed", className: "text-muted-foreground" },
}

/** Built per render, because the labels are translated. */
export const quoteStatusOptions = (t: (key: string) => string) =>
	(Object.keys(QUOTE_STATUS) as QuoteStatus[]).map((value) => ({
		value,
		label: t(QUOTE_STATUS[value].labelKey),
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

/** Dates in the reader's language — this was pinned to en-GB. */
export const formatDate = (value: string, locale = "de") =>
	new Date(value).toLocaleDateString(locale, {
		day: "2-digit",
		month: "short",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	})

/** True once every line carries a price — the precondition for answering. */
export const isFullyPriced = (items: { quotedUnitPrice: string | null }[]) =>
	items.length > 0 && items.every((i) => i.quotedUnitPrice !== null)
