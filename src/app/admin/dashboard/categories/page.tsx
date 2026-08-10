"use client"

import { Loader2 } from "lucide-react"
import { useAdminCategoriesQuery } from "@/redux/api/categoryApi"
import CategoryTable from "./_components/CategoryTable"

/**
 * The category list.
 *
 * Creating and editing are pages of their own, not a dialog over this one. A
 * category is a screen's worth of settings in two languages, and a modal holding
 * that much cannot be linked to, reloaded, or left open while something else is
 * checked — and a stray click on the overlay discards the lot.
 */
export default function CategoriesPage() {
	const { data: categories, isLoading, isError, error } = useAdminCategoriesQuery()

	return (
		<div className="space-y-4">
			{isLoading && (
				<div className="bg-card text-muted-foreground flex items-center justify-center gap-2 rounded-lg border p-16 text-sm">
					<Loader2 className="size-4 animate-spin" />
					Loading categories…
				</div>
			)}

			{isError && (
				<div className="text-destructive bg-card rounded-lg border border-dashed p-16 text-center text-sm">
					{(error as { data?: { message?: string } })?.data?.message ??
						"Could not load categories."}
				</div>
			)}

			{categories && <CategoryTable categories={categories} />}
		</div>
	)
}
