import ComingSoon from "@/components/dashboard/shell/ComingSoon"

export default function PaymentPage() {
	return (
		<ComingSoon
			title="Payment methods"
			description="Payment configuration is not built yet."
			willInclude={[
				"Bank transfer with real IBAN and instructions",
				"Invoice, restricted to DE and AT with order history (rule R9)",
				"Each hidden method reports why",
			]}
		/>
	)
}
