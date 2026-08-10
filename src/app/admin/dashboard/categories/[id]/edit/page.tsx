"use client"

import { use } from "react"
import { Loader2 } from "lucide-react"
import { useAdminCategoriesQuery, useAdminCategoryQuery } from "@/redux/api/categoryApi"
import CategoryForm from "../../_components/CategoryForm"

/**
 * Editing one category.
 *
 * Fetches the category itself as well as the list: the page is reachable by URL
 * and has to work on a cold load, where nothing is cached and the list alone
 * would not tell it which row to open.
 */
export default function EditCategoryPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = use(params)

	const { data: category, isLoading, isError, error } = useAdminCategoryQuery(id)
	const { data: categories, isLoading: listLoading } = useAdminCategoriesQuery()

	if (isLoading || listLoading) {
		return (
			<p className="text-muted-foreground py-24 text-center text-sm">
				<Loader2 className="mr-2 inline size-4 animate-spin" />
				Loading…
			</p>
		)
	}

	if (isError || !category) {
		return (
			<p className="text-destructive py-24 text-center text-sm">
				{(error as { data?: { message?: string } })?.data?.message ?? "Could not load that category."}
			</p>
		)
	}

	return <CategoryForm category={category} allCategories={categories ?? []} />
}
