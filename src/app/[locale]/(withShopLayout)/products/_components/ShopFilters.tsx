"use client"

import { useTranslations } from "next-intl"
import { Search } from "lucide-react"
import { Link } from "@/i18n/navigation"
import { useShopCategoriesQuery } from "@/redux/api/storefrontApi"
import type { PublicCategory } from "@/types/storefront"
import { cn } from "@/lib/utils"

/**
 * Category rail plus the search box.
 *
 * The categories are links, not buttons. A category is a place with its own
 * URL — `/de/produkt-kategorie/ausstechformen` — not a filter state, so it
 * should be shareable, indexable and reachable with the back button. Search,
 * sort and page stay in the query string, where they belong.
 *
 * The tree is rendered one level deep because that is how it comes back; a
 * child list is indented rather than collapsed, since with this catalogue's
 * depth a disclosure would hide two items behind a click.
 */
const CategoryLink = ({
	category,
	activeSlug,
	depth = 0,
}: {
	category: PublicCategory
	activeSlug: string | null
	depth?: number
}) => (
	<>
		<li>
			<Link
				href={{ pathname: "/categories/[slug]", params: { slug: category.slug } }}
				aria-current={activeSlug === category.slug ? "page" : undefined}
				className={cn(
					"hover:text-primary block py-1.5 text-sm transition-colors",
					activeSlug === category.slug && "text-primary font-semibold",
					depth > 0 && "pl-4"
				)}
			>
				{category.name}
				{typeof category.productCount === "number" && (
					<span className="text-muted-foreground ml-1.5 text-xs">({category.productCount})</span>
				)}
			</Link>
		</li>
		{category.children?.map((child) => (
			<CategoryLink key={child.id} category={child} activeSlug={activeSlug} depth={depth + 1} />
		))}
	</>
)

export const ShopFilters = ({
	activeSlug,
	search,
	onSearchChange,
}: {
	activeSlug: string | null
	search: string
	onSearchChange: (value: string) => void
}) => {
	const t = useTranslations("shop")
	const { data: categories = [] } = useShopCategoriesQuery({ tree: true })

	return (
		<aside className="space-y-8">
			<form
				onSubmit={(event) => {
					event.preventDefault()
					const value = new FormData(event.currentTarget).get("q")
					onSearchChange(typeof value === "string" ? value : "")
				}}
				role="search"
			>
				<label htmlFor="shop-search" className="font-heading mb-3 block text-lg font-semibold">
					{t("search")}
				</label>
				<div className="flex">
					<input
						id="shop-search"
						name="q"
						type="search"
						defaultValue={search}
						placeholder={t("searchPlaceholder")}
						className="focus:border-primary min-w-0 flex-1 border px-3 py-2.5 text-sm outline-none"
					/>
					<button
						type="submit"
						aria-label={t("search")}
						className="bg-ink text-ink-foreground px-3.5 transition-opacity hover:opacity-90"
					>
						<Search className="size-4" />
					</button>
				</div>
			</form>

			<nav>
				<h2 className="font-heading mb-3 text-lg font-semibold">{t("categories")}</h2>
				<ul className="divide-y">
					<li>
						<Link
							href="/products"
							aria-current={activeSlug === null ? "page" : undefined}
							className={cn(
								"hover:text-primary block py-1.5 text-sm transition-colors",
								activeSlug === null && "text-primary font-semibold"
							)}
						>
							{t("allCategories")}
						</Link>
					</li>
					{categories.map((item) => (
						<CategoryLink key={item.id} category={item} activeSlug={activeSlug} />
					))}
				</ul>
			</nav>
		</aside>
	)
}

export default ShopFilters
