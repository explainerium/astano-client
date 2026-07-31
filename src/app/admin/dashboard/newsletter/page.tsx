import ComingSoon from "@/components/dashboard/shell/ComingSoon"

export default function NewsletterPage() {
	return (
		<ComingSoon
			title="Newsletter"
			description="Subscriber management is not built yet."
			willInclude={[
				"Subscribers with PENDING or CONFIRMED status",
				"Confirmation timestamp, which is the legal evidence of consent",
				"CleverReach push is not built",
			]}
		/>
	)
}
