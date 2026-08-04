"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { z } from "zod"
import ProForm from "@/components/form/ProForm"
import ProSelect from "@/components/form/ProSelect"
import ProSubmit from "@/components/form/ProSubmit"
import ProTextarea from "@/components/form/ProTextarea"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog"
import { useUpdateOrderStatusMutation } from "@/redux/api/orderApi"
import type { Order, OrderStatus, PaymentStatus } from "@/types/order"
import { ORDER_STATUS_OPTIONS, PAYMENT_STATUS_OPTIONS } from "./orderStatus"

const schema = z.object({
	status: z.enum([
		"PENDING",
		"PROCESSING",
		"ON_HOLD",
		"COMPLETED",
		"CANCELLED",
		"REFUNDED",
		"FAILED",
	]),
	paymentStatus: z.enum(["UNPAID", "PAID", "PARTIALLY_REFUNDED", "REFUNDED", "FAILED"]),
	note: z.string().trim().max(1000),
})

type FormValues = z.infer<typeof schema>

export const OrderStatusDialog = ({
	open,
	onOpenChange,
	order,
}: {
	open: boolean
	onOpenChange: (open: boolean) => void
	order: Order
}) => {
	const [updateStatus] = useUpdateOrderStatusMutation()

	const onSubmit = async (form: FormValues) => {
		try {
			await updateStatus({
				id: order.id,
				data: {
					status: form.status as OrderStatus,
					paymentStatus: form.paymentStatus as PaymentStatus,
					...(form.note.trim() ? { note: form.note.trim() } : {}),
				},
			}).unwrap()
			toast.success("Order updated.")
			onOpenChange(false)
		} catch (error) {
			const message = (error as { data?: { message?: string } })?.data?.message
			toast.error(message ?? "Could not update the order.")
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Update {order.orderNumber}</DialogTitle>
					<DialogDescription>
						Say what the order <em>is</em> now. Stock, refunds and the customer
						email are the server&rsquo;s business, not a second thing to remember.
					</DialogDescription>
				</DialogHeader>

				<ProForm
					onSubmit={onSubmit}
					resolver={zodResolver(schema)}
					defaultValues={{
						status: order.status,
						paymentStatus: order.paymentStatus,
						note: "",
					}}
					className="space-y-5"
				>
					<div className="grid gap-4 sm:grid-cols-2">
						<ProSelect name="status" label="Order status" options={ORDER_STATUS_OPTIONS} />
						<ProSelect
							name="paymentStatus"
							label="Payment status"
							options={PAYMENT_STATUS_OPTIONS}
						/>
					</div>

					<ProTextarea
						name="note"
						label="Note"
						description="Recorded against this change in the order's history. Internal — the customer never sees it."
					/>

					<div className="flex justify-end border-t pt-4">
						<ProSubmit>Update order</ProSubmit>
					</div>
				</ProForm>
			</DialogContent>
		</Dialog>
	)
}

export default OrderStatusDialog
