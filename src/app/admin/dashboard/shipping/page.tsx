import ComingSoon from "@/components/dashboard/shell/ComingSoon"

export default function ShippingPage() {
	return (
		<ComingSoon
			title="Shipping"
			description="Shipping configuration is not built yet."
			willInclude={[
				"Five zones by country",
				"Weight-banded rates with an open-ended top band",
				"Swiss rate is tax-free",
			]}
		/>
	)
}
