"use client"

import { use } from "react"
import { Loader2 } from "lucide-react"
import { useAdminProductQuery } from "@/redux/api/productApi"
import ProductForm from "../../_components/ProductForm"

export default function EditProductPage({
	params,
}: {
	params: Promise<{ id: string }>
}) {
	const { id } = use(params)
	const { data: product, isLoading, isError, error } = useAdminProductQuery(id)

	if (isLoading) {
		return (
			<div className="bg-card text-muted-foreground flex items-center justify-center gap-2 rounded-lg border p-16 text-sm">
				<Loader2 className="size-4 animate-spin" />
				Loading product…
			</div>
		)
	}

	if (isError || !product) {
		return (
			<div className="text-destructive bg-card rounded-lg border border-dashed p-16 text-center text-sm">
				{(error as { data?: { message?: string } })?.data?.message ??
					"Could not load this product."}
			</div>
		)
	}

	// Keyed on the id so navigating between products rebuilds the form with the
	// right defaults — useForm reads defaultValues once.
	return <ProductForm key={product.id} product={product} />
}
