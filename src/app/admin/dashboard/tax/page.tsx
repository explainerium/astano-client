import ComingSoon from "@/components/dashboard/shell/ComingSoon"

export default function TaxPage() {
	return (
		<ComingSoon
			title="Tax"
			description="Tax configuration is not built yet. Checkout refuses to work until at least one class and rate exist, which is deliberate."
			willInclude={[
				"Tax classes, one marked default",
				"Rates per country: 19% EU, 0% Switzerland",
				"Reverse charge for validated EU VAT numbers",
			]}
		/>
	)
}
