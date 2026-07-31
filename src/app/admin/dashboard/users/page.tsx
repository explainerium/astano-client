import ComingSoon from "@/components/dashboard/shell/ComingSoon"

export default function UsersPage() {
	return (
		<ComingSoon
			title="Customers"
			description="Customer management is not built yet."
			willInclude={[
				"Search by name, email or company",
				"Role and status",
				"Order history per customer",
			]}
		/>
	)
}
