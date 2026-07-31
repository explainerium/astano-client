import ComingSoon from "@/components/dashboard/shell/ComingSoon"

export default function B2bPage() {
	return (
		<ComingSoon
			title="Dealers"
			description="The dealer review queue is not built yet. Applications are already arriving through the registration form."
			willInclude={[
				"Pending applications with VAT number and PSI membership",
				"Approve or reject, with a note",
				"Approval unlocks Reseller pricing (rule R5b)",
			]}
		/>
	)
}
