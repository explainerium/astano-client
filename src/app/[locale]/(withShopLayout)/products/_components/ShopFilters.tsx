"use client"

import { useTranslations } from "next-intl"
import { Search } from "lucide-react"
import { useShopCategoriesQuery } from "@/redux/api/storefrontApi"
import type { PublicCategory } from "@/types/storefront"
import { cn } from "@/lib/utils"

/**
 * Category rail plus the search box.
 *
 * Categories are rendered one level deep because that is how the tree comes
 * back; a child list is indented rather than collapsed, since with this
 * catalogue's depth a disclosure would hide two items behind a click.
 */
const CategoryLink = ({
	category,
	active,
	onSelect,
	depth = 0,
}: {
	category: PublicCategory
	active: string | null
	onSelect: (slug: string | null) => void
	depth?: number
}) => (
	<>
		<li>
			<button
				type="button"
				onClick={() => onSelect(category.slug)}
				aria-current={active === category.slug ? "true" : undefined}
				className={cn(
					"hover:text-primary block w-full py-1.5 text-left text-sm transition-colors",
					active === category.slug && "text-primary font-semibold",
					depth > 0 && "pl-4"
				)}
			>
				{category.name}
				{typeof category.productCount === "number" && (
					<span className="text-muted-foreground ml-1.5 text-xs">({category.productCount})</span>
				)}
			</button>
		</li>
		{category.children?.map((child) => (
			<CategoryLink
				key={child.id}
				category={child}
				active={active}
				onSelect={onSelect}
				depth={depth + 1}
			/>
		))}
	</>
)

export const ShopFilters = ({
	category,
	search,
	onCategoryChange,
	onSearchChange,
}: {
	category: string | null
	search: string
	onCategoryChange: (slug: string | null) => void
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
						<button
							type="button"
							onClick={() => onCategoryChange(null)}
							aria-current={category === null ? "true" : undefined}
							className={cn(
								"hover:text-primary block w-full py-1.5 text-left text-sm transition-colors",
								category === null && "text-primary font-semibold"
							)}
						>
							{t("allCategories")}
						</button>
					</li>
					{categories.map((item) => (
						<CategoryLink
							key={item.id}
							category={item}
							active={category}
							onSelect={onCategoryChange}
						/>
					))}
				</ul>
			</nav>
		</aside>
	)
}

export default ShopFilters
