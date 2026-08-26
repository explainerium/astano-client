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
	const { data: categories = [], isLoading } = useShopCategoriesQuery(
		{ tree: true },
		{ refetchOnFocus: true }
	)

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

					/*
					 * The 920px rendition, not the 400px one.
					 *
					 * A card is around 330px wide at the widest breakpoint, which on any
					 * modern display means twice that in real pixels — the grid size was
					 * being stretched and it showed. `sizes` keeps a phone from
					 * downloading the large one anyway.
					 *
					 * Falling back to the original rather than to `grid`, because the
					 * only reason a picture has no 920px rendition is that it was never
					 * that big — the pipeline does not upscale. Two of these categories
					 * are in exactly that position, and for them the original *is* the
					 * largest there is.
					 */
					const src = image ? (image.srcset.detail ?? image.url) : null
					const srcSet = image
						? [
								image.srcset.grid && `${image.srcset.grid} 400w`,
								image.srcset.detail && `${image.srcset.detail} 920w`,
							]
								.filter(Boolean)
								.join(", ")
						: undefined

					return (
						<Link
							key={category.id}
							href={{ pathname: "/categories/[slug]", params: { slug: category.slug } }}
							className="group bg-muted relative flex aspect-square flex-col justify-end overflow-hidden"
						>
							{src && (
								// eslint-disable-next-line @next/next/no-img-element
								<img
									src={src}
									srcSet={srcSet || undefined}
									sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
									alt=""
									loading="lazy"
									className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-105"
								/>
							)}

							{/*
							 * Dark at the foot, nothing at the head.
							 *
							 * The name used to sit on the photograph with nothing behind it,
							 * so on a pale product shot — steel on white, which is most of
							 * this catalogue — it was barely there. A band across the whole
							 * card would fix the reading and lose the picture; this only
							 * darkens the strip the words occupy, and fades out well before
							 * the product does.
							 */}
							<div
								aria-hidden
								className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/85 via-black/45 to-transparent"
							/>

							<div className="relative p-5">
								<h3 className="text-sm font-semibold tracking-wide text-white uppercase drop-shadow-sm">
									{category.name}
								</h3>
								<span className="mt-0.5 block text-xs text-white/75">
									{tShop("viewCategory")}
								</span>
							</div>
						</Link>
					)
				})}
			</div>
		</section>
	)
}

export default CategoryGrid
