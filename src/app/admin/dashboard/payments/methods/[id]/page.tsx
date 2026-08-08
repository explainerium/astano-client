"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { ArrowLeft, Loader2 } from "lucide-react"
import { usePaymentMethodsQuery } from "@/redux/api/paymentApi"
import PaymentMethodForm from "../../_components/PaymentMethodForm"

/**
 * Edits one offline method.
 *
 * Read from the list query rather than a per-id one: the API has no
 * `GET /payment-methods/:id` for admins that returns the rule fields, the list
 * is small and already cached from the screen the user just came from, so this
 * renders instantly instead of showing a spinner for a round trip.
 */
export default function EditPaymentMethodPage() {
	const { id } = useParams<{ id: string }>()
	const { data: methods, isLoading } = usePaymentMethodsQuery()

	const method = methods?.find((row) => row.id === id)

	if (isLoading) {
		return (
			<div className="bg-card text-muted-foreground flex items-center justify-center gap-2 rounded-lg border p-16 text-sm">
				<Loader2 className="size-4 animate-spin" />
				Loading method…
			</div>
		)
	}

	if (!method) {
		return (
			<div className="bg-card rounded-lg border border-dashed p-16 text-center">
				<p className="text-muted-foreground text-sm">That payment method no longer exists.</p>
				<Link
					href="/admin/dashboard/payments"
					className="text-primary mt-3 inline-block text-sm hover:underline"
				>
					Back to payments
				</Link>
			</div>
		)
	}

	return (
		<div className="space-y-5">
			<div className="flex items-start gap-3">
				<Link
					href="/admin/dashboard/payments"
					aria-label="Back to payments"
					className="text-muted-foreground hover:text-foreground p-2"
				>
					<ArrowLeft className="size-4" />
				</Link>
				<div>
					<h1 className="font-heading text-xl font-semibold tracking-tight">{method.title}</h1>
					<p className="text-muted-foreground text-sm">
						<code className="font-mono text-xs">{method.code}</code>
					</p>
				</div>
			</div>

			<PaymentMethodForm method={method} />
		</div>
	)
}
