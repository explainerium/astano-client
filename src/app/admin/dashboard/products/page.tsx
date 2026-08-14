"use client"

import { useTranslations } from "next-intl"
import { useCallback, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import { useAdminCategoriesQuery } from "@/redux/api/categoryApi"
import { useAdminProductsQuery } from "@/redux/api/productApi"
import {
	buildTree,
	displayName,
	flattenTree,
} from "../categories/_components/categoryTree"
import type { AdminProduct, ProductSort, SortDirection } from "@/types/product"
import ProductTable, { type ProductFilters } from "./_components/ProductTable"

/** Fifty is the API's own default and about two screens of rows. */
const DEFAULT_PAGE_SIZE = 50

/** What the per-page control offers. */
export const PAGE_SIZES = [10, 25, 50, 75, 100, 150, 200]

const LIST_PATH = "/admin/dashboard/products"

export default function ProductsPage() {
	const t = useTranslations("admin")
	const router = useRouter()
	const searchParams = useSearchParams()
	const [filters, setFilters] = useState<ProductFilters>({ search: "" })

	/**
	 * Which page and how many, kept in the URL rather than in state.
	 *
	 * State was lost the moment you opened a product: editing one from page 2
	 * and coming back landed on page 1, every time. The URL survives the round
	 * trip, so the Back button works, the address is worth sending to someone,
	 * and the "Products" button on the editor can return you exactly where you
	 * were by carrying this query with it.
	 */
	/**
	 * The order, also in the URL.
	 *
	 * Newest created first by default. The list used to come back ordered by
	 * when a product was last touched, so saving one sent it to the top — the
	 * thing an admin does most rearranged the page under them every time.
	 */
	const sort = (["created", "updated", "name", "price"] as const).includes(
		searchParams.get("sort") as ProductSort
	)
		? (searchParams.get("sort") as ProductSort)
		: "created"
	const dir: SortDirection = searchParams.get("dir") === "asc" ? "asc" : "desc"

	const page = Math.max(1, Number(searchParams.get("page") ?? 1) || 1)
	const limit = PAGE_SIZES.includes(Number(searchParams.get("limit")))
		? Number(searchParams.get("limit"))
		: DEFAULT_PAGE_SIZE

	const setParams = useCallback(
		(changes: Record<string, string | null>) => {
			const next = new URLSearchParams(searchParams.toString())
			for (const [key, value] of Object.entries(changes)) {
				if (value === null || value === "") next.delete(key)
				else next.set(key, value)
			}

			const query = next.toString()
			// replace, not push: paging is not a place you want the Back button to
			// walk through one screen at a time.
			router.replace(query ? `${LIST_PATH}?${query}` : LIST_PATH, { scroll: false })
		},
		[router, searchParams]
	)

	/**
	 * A filter change resets to the first page.
	 *
	 * Page 4 of a narrowed list is usually not there, and an empty table with no
	 * explanation reads as "the filter found nothing" rather than "you are past
	 * the end". The orders list already does this.
	 */
	const changeFilters = (next: ProductFilters) => {
		setFilters(next)
		setParams({ page: null })
	}

	const {
		data: result,
		isLoading,
		isFetching,
		isError,
		error,
	} = useAdminProductsQuery({
		search: filters.search.trim() || undefined,
		status: filters.status,
		kind: filters.kind,
		categoryId: filters.categoryId,
		stockStatus: filters.stockStatus,
		page,
		limit,
		sort,
		dir,
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

	/**
	 * Where the editor should send you when you press Products.
	 *
	 * Carried in the link rather than left to history, so it is still right in a
	 * tab opened from the middle-click that the edit button now supports — that
	 * tab has no history to go back through.
	 */
	const listQuery = searchParams.toString()
	const editHref = (product: AdminProduct) => {
		const href = `${LIST_PATH}/${product.id}/edit`
		return listQuery ? `${href}?back=${encodeURIComponent(`${LIST_PATH}?${listQuery}`)}` : href
	}

	return (
		<div className="space-y-4">
			{isLoading && (
				<div className="bg-card text-muted-foreground flex items-center justify-center gap-2 rounded-lg border p-16 text-sm">
					<Loader2 className="size-4 animate-spin" />{t("loadingProducts")}</div>
			)}

			{isError && (
				<div className="text-destructive bg-card rounded-lg border border-dashed p-16 text-center text-sm">
					{(error as { data?: { message?: string } })?.data?.message ??
						t("couldNotLoadProducts")}
				</div>
			)}

			{result && (
				<ProductTable
					products={products}
					filters={filters}
					onFiltersChange={changeFilters}
					categories={categories}
					statusCounts={{
						all: allCount?.meta?.total,
						PUBLISHED: publishedCount?.meta?.total,
						DRAFT: draftCount?.meta?.total,
						ARCHIVED: archivedCount?.meta?.total,
					}}
					sort={sort}
					dir={dir}
					// A new column resets to the first page: page 4 of one order is
					// not page 4 of another.
					onSortChange={(nextSort, nextDir) =>
						setParams({
							sort: nextSort === "created" ? null : nextSort,
							dir: nextDir === "desc" ? null : nextDir,
							page: null,
						})
					}
					meta={result.meta}
					isFetching={isFetching}
					onPageChange={(next) => setParams({ page: next === 1 ? null : String(next) })}
					pageSize={limit}
					pageSizes={PAGE_SIZES}
					// Back to the first page: page 5 of 50 is not page 5 of 200.
					onPageSizeChange={(next) =>
						setParams({
							limit: next === DEFAULT_PAGE_SIZE ? null : String(next),
							page: null,
						})
					}
					editHref={editHref}
					onCreate={() => router.push(`${LIST_PATH}/create`)}
					onEdit={(product: AdminProduct) => router.push(editHref(product))}
				/>
			)}
		</div>
	)
}
