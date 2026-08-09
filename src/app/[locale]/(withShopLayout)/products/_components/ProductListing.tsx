"use client"

import { useCallback, useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter, useSearchParams } from "next/navigation"
import ProductCard from "@/app/[locale]/_components/ProductCard"
import QuickViewDialog from "@/app/[locale]/_components/QuickViewDialog"
import CompareBar from "@/app/[locale]/_components/CompareBar"
import Pagination from "@/app/[locale]/_components/Pagination"
import { useShopProductsQuery } from "@/redux/api/storefrontApi"
import { usePublicSettingsQuery } from "@/redux/api/settingApi"
import type { PublicProduct, PublicProductListParams } from "@/types/storefront"
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

/**
 * The live shop's own defaults: twelve per page, and the same four choices it
 * offers (`shop_per_page: 12`, `per_page_options: 9,12,18,24`).
 */
const PER_PAGE_OPTIONS = [9, 12, 18, 24]

/**
 * Used until the shop's own setting arrives, and if it is ever set to something
 * outside the four choices above.
 */
const FALLBACK_PER_PAGE = 12

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

	// The shop's own defaults, editable in Settings. The URL still wins — a
	// customer who picked 24 keeps 24 when the admin changes the default.
	const { data: shopSettings } = usePublicSettingsQuery()

	const defaultPerPage = PER_PAGE_OPTIONS.includes(Number(shopSettings?.["shop.productsPerPage"]))
		? Number(shopSettings!["shop.productsPerPage"])
		: FALLBACK_PER_PAGE

	const columns = Number(shopSettings?.["shop.productColumns"] ?? 3)

	const perPage = PER_PAGE_OPTIONS.includes(Number(searchParams.get("per")))
		? Number(searchParams.get("per"))
		: defaultPerPage

	// Blank rather than 0 when absent — 0 is a real bound the customer might set.
	const minPrice = searchParams.get("min")
	const maxPrice = searchParams.get("max")

	/** The product the quick view is open on, or null. */
	const [quickView, setQuickView] = useState<PublicProduct | null>(null)

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
		...(minPrice ? { minPrice: Number(minPrice) } : {}),
		...(maxPrice ? { maxPrice: Number(maxPrice) } : {}),
		sort,
		page,
		limit: perPage,
	})

	const products = data?.data ?? []
	const total = data?.meta?.total ?? 0
	const totalPages = data?.meta?.totalPages ?? 1
	// Only the search is clearable here; leaving a category means navigating.
	const hasFilters = Boolean(search || minPrice || maxPrice)

	return (
		/*
		 * Narrower than the header's 1400 and with a wider rail: at full width the
		 * three columns were stretched wide enough that a card was mostly empty
		 * space, and the filters were cramped against them.
		 */
		<div className="mx-auto grid w-full max-w-[1280px] gap-10 px-6 py-12 lg:grid-cols-[280px_1fr]">
			<ShopFilters
				activeSlug={category}
				search={search}
				onSearchChange={(value) => setParams({ q: value })}
				minPrice={minPrice ?? ""}
				maxPrice={maxPrice ?? ""}
				// The bounds describe everything matching the *other* filters, so the
				// placeholders do not shrink as the customer narrows the price.
				bounds={data?.meta?.priceBounds ?? null}
				onPriceChange={({ min, max }) => setParams({ min, max })}
			/>

			<div>
				<div className="flex flex-wrap items-center gap-4 border-b pb-4">
					<p className="text-muted-foreground text-sm" aria-live="polite">
						{isFetching ? t("loading") : t("resultsCount", { count: total })}
					</p>

					{hasFilters && (
						<button
							type="button"
							onClick={() => setParams({ q: null, min: null, max: null })}
							className="text-primary text-sm underline underline-offset-2"
						>
							{t("clearFilters")}
						</button>
					)}

					<div className="ml-auto flex flex-wrap items-center gap-4">
						{/* How many per page, the same four the live shop offers. Changing
						    it returns to page 1, because page 5 of 24 is not page 5 of 9. */}
						<div className="flex items-center gap-2">
							<label htmlFor="shop-per-page" className="text-muted-foreground text-sm">
								{t("perPage")}
							</label>
							<select
								id="shop-per-page"
								value={perPage}
								onChange={(event) =>
									setParams({
										per:
											Number(event.target.value) === defaultPerPage
												? null
												: event.target.value,
									})
								}
								className="focus:border-primary border px-3 py-2 text-sm outline-none"
							>
								{PER_PAGE_OPTIONS.map((value) => (
									<option key={value} value={value}>
										{value}
									</option>
								))}
							</select>
						</div>

						<div className="flex items-center gap-2">
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
					/*
					 * Three across, as the live shop has it. `items-stretch` with a
					 * full-height card is what makes every tile in a row end level
					 * however long its name runs.
					 */
					<div
						className={cn(
							"mt-6 grid grid-cols-2 items-stretch gap-6",
							// Tailwind needs whole class names, so this is a lookup rather
							// than an interpolated `lg:grid-cols-${n}` the compiler cannot see.
							columns === 2 ? "lg:grid-cols-2" : columns === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3",
							isFetching && "opacity-60 transition-opacity"
						)}
					>
						{products.map((product) => (
							<ProductCard key={product.id} product={product} onQuickView={setQuickView} />
						))}
					</div>
				)}

				<Pagination
					page={page}
					totalPages={totalPages}
					onPage={(next) => setParams({ page: String(next) })}
				/>
			</div>

			{/* Both are portalled or fixed, so where they sit in the tree only
			    decides who owns their state — not where they appear. */}
			<QuickViewDialog product={quickView} onOpenChange={(open) => !open && setQuickView(null)} />
			<CompareBar />
		</div>
	)
}

export default ProductListing
