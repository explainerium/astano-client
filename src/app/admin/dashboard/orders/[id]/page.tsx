import ComingSoon from "@/components/dashboard/shell/ComingSoon"

export default function OrderDetailPage() {
	return (
		<ComingSoon
			title="Order detail"
			description="The single-order screen is not built yet."
			willInclude={[
				"Line items, tax and shipping breakdown",
				"Status history and internal notes",
				"Customer and delivery addresses",
			]}
		/>
	)
}
