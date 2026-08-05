"use client"

import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"

/**
 * Colour by meaning, not by taxonomy.
 *
 * Green is "this went well and is finished", amber "waiting on someone", red
 * "it did not happen", grey "over, uneventfully". A customer scanning a list of
 * orders reads the colour before the word.
 */
const TONE: Record<string, string> = {
	// Orders
	PENDING: "bg-amber-100 text-amber-900",
	PROCESSING: "bg-sky-100 text-sky-900",
	ON_HOLD: "bg-neutral-200 text-neutral-700",
	COMPLETED: "bg-emerald-100 text-emerald-900",
	CANCELLED: "bg-neutral-100 text-neutral-500",
	REFUNDED: "bg-neutral-200 text-neutral-700",
	FAILED: "bg-red-100 text-red-900",
	// Payment
	UNPAID: "bg-amber-100 text-amber-900",
	PAID: "bg-emerald-100 text-emerald-900",
	PARTIALLY_REFUNDED: "bg-neutral-200 text-neutral-700",
	// Quotes
	OPEN: "bg-amber-100 text-amber-900",
	ANSWERED: "bg-sky-100 text-sky-900",
	ACCEPTED: "bg-emerald-100 text-emerald-900",
	DECLINED: "bg-red-100 text-red-900",
	EXPIRED: "bg-neutral-100 text-neutral-500",
	CLOSED: "bg-neutral-200 text-neutral-700",
}

export const StatusChip = ({
	status,
	kind,
}: {
	status: string
	kind: "orderStatus" | "paymentStatus" | "quoteStatus"
}) => {
	const t = useTranslations("account")

	return (
		<span
			className={cn(
				"inline-flex px-2.5 py-1 text-xs font-medium whitespace-nowrap",
				TONE[status] ?? "bg-neutral-100 text-neutral-600"
			)}
		>
			{t(`${kind}.${status}` as never) ?? status}
		</span>
	)
}

export default StatusChip
