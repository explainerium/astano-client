import type { OrderStatus, PaymentStatus } from "@/types/order"

export interface Chip {
	/**
	 * A key into the admin catalogue, not a finished word.
	 *
	 * The colour beside it is not text and stays here; the label cannot,
	 * because this module is evaluated once at import time and has no locale
	 * to resolve against.
	 */
	labelKey: string
	className: string
}

/**
 * Colour carries urgency, not taxonomy — the same rule the product list uses.
 *
 * Green is settled, red needs attention, orange is waiting on someone, grey is
 * in flight or out of circulation. Scanning the column should answer "is
 * anything stuck?" without reading a word.
 *
 * PENDING is orange rather than grey on purpose: on this shop it means a bank
 * transfer has not landed, so it is the status most likely to need chasing.
 */
export const ORDER_STATUS: Record<OrderStatus, Chip> = {
	PENDING: { labelKey: "orderStatusPending", className: "border-transparent bg-accent-soft-strong text-primary" },
	PROCESSING: { labelKey: "orderStatusProcessing", className: "border-transparent bg-muted text-foreground" },
	ON_HOLD: { labelKey: "orderStatusOnHold", className: "border-transparent bg-accent-soft-strong text-primary" },
	COMPLETED: { labelKey: "orderStatusCompleted", className: "border-transparent bg-positive-soft text-positive" },
	CANCELLED: { labelKey: "orderStatusCancelled", className: "text-muted-foreground" },
	REFUNDED: { labelKey: "orderStatusRefunded", className: "text-muted-foreground" },
	FAILED: { labelKey: "orderStatusFailed", className: "border-transparent bg-negative-soft text-negative" },
}

export const PAYMENT_STATUS: Record<PaymentStatus, Chip> = {
	UNPAID: { labelKey: "paymentUnpaid", className: "text-muted-foreground" },
	PAID: { labelKey: "paymentPaid", className: "border-transparent bg-positive-soft text-positive" },
	PARTIALLY_REFUNDED: { labelKey: "paymentPartRefunded", className: "text-muted-foreground" },
	REFUNDED: { labelKey: "orderStatusRefunded", className: "text-muted-foreground" },
	FAILED: { labelKey: "orderStatusFailed", className: "border-transparent bg-negative-soft text-negative" },
}

/**
 * Select options, built per render because their labels are translated.
 *
 * A module-level constant cannot hold them: it is evaluated once at import,
 * before any locale exists.
 */
export const orderStatusOptions = (t: (key: string) => string) =>
	(Object.keys(ORDER_STATUS) as OrderStatus[]).map((value) => ({
		value,
		label: t(ORDER_STATUS[value].labelKey),
	}))

export const paymentStatusOptions = (t: (key: string) => string) =>
	(Object.keys(PAYMENT_STATUS) as PaymentStatus[]).map((value) => ({
		value,
		label: t(PAYMENT_STATUS[value].labelKey),
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

/**
 * Dates in the reader's language.
 *
 * Was pinned to en-GB, which printed "12 Aug 2026" on a German dashboard —
 * the one screen staff read most, ignoring the language they had chosen.
 */
export const formatDate = (value: string, locale = "de") =>
	new Date(value).toLocaleDateString(locale, {
		day: "2-digit",
		month: "short",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	})

/** "Ada Lovelace · ASSCA GmbH" from whichever address the order carries. */
export const customerName = (order: {
	addresses: { billing?: { firstName: string | null; lastName: string | null; company: string | null } }
}) => {
	const a = order.addresses.billing
	if (!a) return "—"
	const person = [a.firstName, a.lastName].filter(Boolean).join(" ")
	return [person || null, a.company].filter(Boolean).join(" · ") || "—"
}
