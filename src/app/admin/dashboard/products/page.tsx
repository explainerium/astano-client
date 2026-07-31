"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { useAdminCategoriesQuery } from "@/redux/api/categoryApi"
import { useAdminProductsQuery } from "@/redux/api/productApi"
import {
	buildTree,
	displayName,
	flattenTree,
} from "../categories/_components/categoryTree"
import type { AdminProduct } from "@/types/product"
import ProductTable, { type ProductFilters } from "./_components/ProductTable"

export default function ProductsPage() {
	const router = useRouter()
	const [filters, setFilters] = useState<ProductFilters>({ search: "" })

	const {
		data: result,
		isLoading,
		isError,
		error,
	} = useAdminProductsQuery({
		search: filters.search.trim() || undefined,
		status: filters.status,
		kind: filters.kind,
		categoryId: filters.categoryId,
		stockStatus: filters.stockStatus,
		limit: 100,
	})

	// Flattened to a tree order so the filter reads like the catalogue does.
	const { data: rawCategories = [] } = useAdminCategoriesQuery()
	const categories = flattenTree(buildTree(rawCategories)).map((category) => ({
		id: category.id,
		name: displayName(category),
		depth: category.depth,
		/**
		 * Products filed directly in this category, not counting sub-categories —
		 * which is exactly what the filter selects, so the number always matches
		 * the rows you get back.
		 */
		productCount: category.productCount,
	}))

	/**
	 * Counts for the status links. Four cheap calls — `limit: 1` means only the
	 * total is read — rather than one endpoint that returns them together. Worth
	 * revisiting if the catalogue grows, since the admin list returns full detail
	 * per row even when only the count is wanted.
	 */
	const { data: allCount } = useAdminProductsQuery({ limit: 1 })
	const { data: publishedCount } = useAdminProductsQuery({ status: "PUBLISHED", limit: 1 })
	const { data: draftCount } = useAdminProductsQuery({ status: "DRAFT", limit: 1 })
	const { data: archivedCount } = useAdminProductsQuery({ status: "ARCHIVED", limit: 1 })

	const products = result?.data ?? []

	return (
		<div className="space-y-4">
			{isLoading && (
				<div className="bg-card text-muted-foreground flex items-center justify-center gap-2 rounded-lg border p-16 text-sm">
					<Loader2 className="size-4 animate-spin" />
					Loading products…
				</div>
			)}

			{isError && (
				<div className="text-destructive bg-card rounded-lg border border-dashed p-16 text-center text-sm">
					{(error as { data?: { message?: string } })?.data?.message ??
						"Could not load products."}
				</div>
			)}

			{result && (
				<ProductTable
					products={products}
					filters={filters}
					onFiltersChange={setFilters}
					categories={categories}
					statusCounts={{
						all: allCount?.meta?.total,
						PUBLISHED: publishedCount?.meta?.total,
						DRAFT: draftCount?.meta?.total,
						ARCHIVED: archivedCount?.meta?.total,
					}}
					onCreate={() => router.push("/admin/dashboard/products/create")}
					onEdit={(product: AdminProduct) =>
						router.push(`/admin/dashboard/products/${product.id}/edit`)
					}
				/>
			)}
		</div>
	)
}
