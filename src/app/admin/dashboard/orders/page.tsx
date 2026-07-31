import ComingSoon from "@/components/dashboard/shell/ComingSoon"

export default function OrdersPage() {
	return (
		<ComingSoon
			title="Orders"
			description="Order management is not built yet. The API is complete: listing, status transitions, invoices and stock handling all work."
			willInclude={[
				"Order list with status filters",
				"Mark paid, processing, completed, cancelled",
				"PDF invoice download",
				"Stock returned on cancellation",
			]}
		/>
	)
}
