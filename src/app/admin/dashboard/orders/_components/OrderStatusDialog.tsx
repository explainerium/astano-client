"use client"

import { useTranslations } from "next-intl"
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
import { orderStatusOptions, paymentStatusOptions } from "./orderStatus"

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
	const t = useTranslations("admin")
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
			toast.success(t("orderUpdated"))
			onOpenChange(false)
		} catch (error) {
			const message = (error as { data?: { message?: string } })?.data?.message
			toast.error(message ?? t("couldNotUpdateTheOrder"))
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>{t("updateOrderNumber", { number: order.orderNumber })}</DialogTitle>
					<DialogDescription>
						{t.rich("statusDialogBody", { em: (chunks) => <em>{chunks}</em> })}
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
						<ProSelect name="status" label={t("orderStatus")} options={orderStatusOptions(t)} />
						<ProSelect
							name="paymentStatus"
							label={t("paymentStatus")}
							options={paymentStatusOptions(t)}
						/>
					</div>

					<ProTextarea
						name="note"
						label={t("note")}
						description={t("recordedAgainstThisChangeInThe")}
					/>

					<div className="flex justify-end border-t pt-4">
						<ProSubmit>{t("updateOrder")}</ProSubmit>
					</div>
				</ProForm>
			</DialogContent>
		</Dialog>
	)
}

export default OrderStatusDialog
