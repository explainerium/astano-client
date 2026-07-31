import ComingSoon from "@/components/dashboard/shell/ComingSoon"

export default function ContactPage() {
	return (
		<ComingSoon
			title="Contact messages"
			description="The contact inbox is not built yet."
			willInclude={[
				"Messages from the storefront form",
				"Mark as handled",
				"Honeypot submissions are already discarded silently",
			]}
		/>
	)
}
