"use client"

import { useCallback } from "react"
import { useTranslations } from "next-intl"
import { useRouter, useSearchParams } from "next/navigation"
import { ChevronLeft, ChevronRight } from "lucide-react"
import ProductCard from "@/app/[locale]/_components/ProductCard"
import { useShopProductsQuery } from "@/redux/api/storefrontApi"
import type { PublicProductListParams } from "@/types/storefront"
import { cn } from "@/lib/utils"
import ShopFilters from "./ShopFilters"

const SORTS: NonNullable<PublicProductListParams["sort"]>[] = [
	"default",
	"newest",
	"name",
	"price_asc",
	"price_desc",
]

const SORT_LABEL: Record<string, string> = {
	default: "sortDefault",
	newest: "sortNewest",
	name: "sortName",
	price_asc: "sortPriceAsc",
	price_desc: "sortPriceDesc",
}

const PER_PAGE = 24

/**
 * The shop archive, shared by /products and every category page.
 *
 * Filter state lives in the URL rather than in component state, so a filtered
 * view is shareable, survives a reload, and the back button steps through it.
 * `useSearchParams` is the single source of truth — nothing is mirrored into
 * local state, which is what usually makes the two disagree.
 *
 * The category is the exception: it arrives as a prop because it is part of the
 * *path* on a category page, not a query parameter. A category is a place with
 * its own URL, not a filter setting.
 */
export const ProductListing = ({ category = null }: { category?: string | null }) => {
	const t = useTranslations("shop")
	const router = useRouter()
	const searchParams = useSearchParams()

	const search = searchParams.get("q") ?? ""
	const sort = (searchParams.get("sort") as PublicProductListParams["sort"]) ?? "default"
	const page = Math.max(1, Number(searchParams.get("page") ?? 1) || 1)

	/** Rewrites the query string, always resetting to page 1 unless paging. */
	const setParams = useCallback(
		(changes: Record<string, string | null>) => {
			const next = new URLSearchParams(searchParams.toString())
			for (const [key, value] of Object.entries(changes)) {
				if (value === null || value === "") next.delete(key)
				else next.set(key, value)
			}
			if (!("page" in changes)) next.delete("page")
			const query = next.toString()
			router.push(query ? `?${query}` : "?", { scroll: true })
		},
		[router, searchParams]
	)

	const { data, isFetching, isError, refetch } = useShopProductsQuery({
		...(category ? { category } : {}),
		...(search ? { search } : {}),
		sort,
		page,
		limit: PER_PAGE,
	})

	const products = data?.data ?? []
	const total = data?.meta?.total ?? 0
	const totalPages = data?.meta?.totalPages ?? 1
	// Only the search is clearable here; leaving a category means navigating.
	const hasFilters = Boolean(search)

	return (
		<div className="mx-auto grid w-full max-w-[1400px] gap-10 px-6 py-12 lg:grid-cols-[240px_1fr]">
			<ShopFilters
				activeSlug={category}
				search={search}
				onSearchChange={(value) => setParams({ q: value })}
			/>

			<div>
				<div className="flex flex-wrap items-center gap-4 border-b pb-4">
					<p className="text-muted-foreground text-sm" aria-live="polite">
						{isFetching ? t("loading") : t("resultsCount", { count: total })}
					</p>

					{hasFilters && (
						<button
							type="button"
							onClick={() => setParams({ q: null })}
							className="text-primary text-sm underline underline-offset-2"
						>
							{t("clearFilters")}
						</button>
					)}

					<div className="ml-auto flex items-center gap-2">
						<label htmlFor="shop-sort" className="text-muted-foreground text-sm">
							{t("sortBy")}
						</label>
						<select
							id="shop-sort"
							value={sort}
							onChange={(event) => setParams({ sort: event.target.value })}
							className="focus:border-primary border px-3 py-2 text-sm outline-none"
						>
							{SORTS.map((value) => (
								<option key={value} value={value}>
									{t(SORT_LABEL[value])}
								</option>
							))}
						</select>
					</div>
				</div>

				{isError ? (
					<div className="py-20 text-center">
						<p className="text-muted-foreground text-sm">{t("loadError")}</p>
						<button
							type="button"
							onClick={() => refetch()}
							className="bg-primary text-primary-foreground mt-4 px-6 py-2.5 text-sm font-semibold tracking-wide uppercase"
						>
							{t("retry")}
						</button>
					</div>
				) : !products.length && !isFetching ? (
					<p className="text-muted-foreground py-20 text-center text-sm">{t("noProducts")}</p>
				) : (
					<div
						className={cn(
							"mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
							isFetching && "opacity-60 transition-opacity"
						)}
					>
						{products.map((product) => (
							<ProductCard key={product.id} product={product} />
						))}
					</div>
				)}

				{totalPages > 1 && (
					<nav className="mt-12 flex items-center justify-center gap-4">
						<button
							type="button"
							disabled={page <= 1}
							onClick={() => setParams({ page: String(page - 1) })}
							className="inline-flex items-center gap-1 border px-4 py-2 text-sm disabled:opacity-40"
						>
							<ChevronLeft className="size-4" />
							{t("previous")}
						</button>
						<span className="text-muted-foreground text-sm">
							{t("pageOf", { page, total: totalPages })}
						</span>
						<button
							type="button"
							disabled={page >= totalPages}
							onClick={() => setParams({ page: String(page + 1) })}
							className="inline-flex items-center gap-1 border px-4 py-2 text-sm disabled:opacity-40"
						>
							{t("next")}
							<ChevronRight className="size-4" />
						</button>
					</nav>
				)}
			</div>
		</div>
	)
}

export default ProductListing
