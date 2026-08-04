import type { OrderStatus, PaymentStatus } from "@/types/order"

export interface Chip {
	label: string
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
	PENDING: { label: "Pending", className: "border-transparent bg-accent-soft-strong text-primary" },
	PROCESSING: { label: "Processing", className: "border-transparent bg-muted text-foreground" },
	ON_HOLD: { label: "On hold", className: "border-transparent bg-accent-soft-strong text-primary" },
	COMPLETED: { label: "Completed", className: "border-transparent bg-positive-soft text-positive" },
	CANCELLED: { label: "Cancelled", className: "text-muted-foreground" },
	REFUNDED: { label: "Refunded", className: "text-muted-foreground" },
	FAILED: { label: "Failed", className: "border-transparent bg-negative-soft text-negative" },
}

export const PAYMENT_STATUS: Record<PaymentStatus, Chip> = {
	UNPAID: { label: "Unpaid", className: "text-muted-foreground" },
	PAID: { label: "Paid", className: "border-transparent bg-positive-soft text-positive" },
	PARTIALLY_REFUNDED: { label: "Part refunded", className: "text-muted-foreground" },
	REFUNDED: { label: "Refunded", className: "text-muted-foreground" },
	FAILED: { label: "Failed", className: "border-transparent bg-negative-soft text-negative" },
}

export const ORDER_STATUS_OPTIONS = (Object.keys(ORDER_STATUS) as OrderStatus[]).map((value) => ({
	value,
	label: ORDER_STATUS[value].label,
}))

export const PAYMENT_STATUS_OPTIONS = (Object.keys(PAYMENT_STATUS) as PaymentStatus[]).map(
	(value) => ({ value, label: PAYMENT_STATUS[value].label })
)

const money = new Intl.NumberFormat("en-GB", { style: "currency", currency: "EUR" })

export const formatMoney = (value: string) => money.format(Number(value))

export const formatDate = (value: string) =>
	new Date(value).toLocaleDateString("en-GB", {
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
