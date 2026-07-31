import ComingSoon from "@/components/dashboard/shell/ComingSoon"

export default function QuotesPage() {
	return (
		<ComingSoon
			title="Quote requests"
			description="The Anfragekorb admin is not built yet. The API supports the full thread."
			willInclude={[
				"Review incoming requests",
				"Price each line, then reply",
				"Internal notes the customer never sees",
				"Convert an accepted quote into an order",
			]}
		/>
	)
}
