import ComingSoon from "@/components/dashboard/shell/ComingSoon"

export default function EditProductPage() {
	return (
		<ComingSoon
			title="Edit product"
			description="The product editor is being built. Until then, products can be created and inspected through the API."
			willInclude={[
				"Everything on the create form, loaded from the product",
				"Partial saves that never overwrite untouched fields",
			]}
		/>
	)
}
