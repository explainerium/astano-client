"use client"

import { Loader2 } from "lucide-react"
import { useAdminCategoriesQuery } from "@/redux/api/categoryApi"
import CategoryForm from "../_components/CategoryForm"

/**
 * Creating a category.
 *
 * The list is still fetched, because the parent picker needs it — a new
 * category is placed in the tree at the moment it is made, not afterwards.
 */
export default function NewCategoryPage() {
	const { data: categories, isLoading, isError } = useAdminCategoriesQuery()

	if (isLoading) {
		return (
			<p className="text-muted-foreground py-24 text-center text-sm">
				<Loader2 className="mr-2 inline size-4 animate-spin" />
				Loading…
			</p>
		)
	}

	if (isError) {
		return (
			<p className="text-destructive py-24 text-center text-sm">Could not load the categories.</p>
		)
	}

	return <CategoryForm allCategories={categories ?? []} />
}
