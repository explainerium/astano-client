"use client"

import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import { useShopCategoriesQuery } from "@/redux/api/storefrontApi"

/**
 * "Finden Sie das passende Produkt für Ihre Bedürfnisse".
 *
 * Top-level categories only — the live grid does not nest. Hidden categories
 * never reach this endpoint, so nothing has to be filtered here.
 */
export const CategoryGrid = () => {
	const t = useTranslations("home.categories")
	const tShop = useTranslations("shop")
	const { data: categories = [], isLoading } = useShopCategoriesQuery({ tree: true })

	return (
		<section className="mx-auto w-full max-w-[1400px] px-6 py-16">
			<h2 className="font-heading mx-auto max-w-2xl text-center text-3xl leading-tight font-extrabold sm:text-4xl">
				{t("heading")}
			</h2>

			<div className="mt-12 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
				{isLoading &&
					Array.from({ length: 4 }).map((_, i) => (
						<div key={i} className="bg-muted aspect-square animate-pulse" />
					))}

				{categories.map((category) => {
					const image = category.image
					const thumb = image ? (image.srcset.grid ?? image.url) : null

					return (
						<Link
							key={category.id}
							href={{ pathname: "/categories/[slug]", params: { slug: category.slug } }}
							className="group bg-muted relative flex aspect-square flex-col justify-end overflow-hidden p-5"
						>
							{thumb && (
								// eslint-disable-next-line @next/next/no-img-element
								<img
									src={thumb}
									alt=""
									loading="lazy"
									className="absolute inset-0 size-full object-contain p-6 transition-transform duration-300 group-hover:scale-105"
								/>
							)}
							<h3 className="relative text-sm font-semibold tracking-wide uppercase">
								{category.name}
							</h3>
							<span className="text-muted-foreground relative mt-0.5 text-xs">
								{tShop("viewCategory")}
							</span>
						</Link>
					)
				})}
			</div>
		</section>
	)
}

export default CategoryGrid
