import ComingSoon from "@/components/dashboard/shell/ComingSoon"

export default function CreateProductPage() {
	return (
		<ComingSoon
			title="New product"
			description="The product editor is being built. The list, categories, attributes and media are ready; this form is next."
			willInclude={[
				"Name, slug and descriptions per language",
				"Categories, visibility and quote flag",
				"MOQ and tier ladders per role",
				"Variants, images and configurator options",
			]}
		/>
	)
}
