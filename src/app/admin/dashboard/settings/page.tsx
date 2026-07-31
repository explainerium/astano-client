import ComingSoon from "@/components/dashboard/shell/ComingSoon"

export default function SettingsPage() {
	return (
		<ComingSoon
			title="Settings"
			description="Store settings are not built yet."
			willInclude={[
				"Company details for invoices and email footers",
				"Which settings are public to the storefront",
			]}
		/>
	)
}
