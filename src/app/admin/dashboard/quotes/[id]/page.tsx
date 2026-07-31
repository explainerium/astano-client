import ComingSoon from "@/components/dashboard/shell/ComingSoon"

export default function QuoteDetailPage() {
	return (
		<ComingSoon
			title="Quote detail"
			description="The single-quote thread is not built yet."
			willInclude={[
				"Priced lines and recomputed subtotal",
				"Reply, which moves the status to ANSWERED",
				"Expiry date and conversion to an order",
			]}
		/>
	)
}
