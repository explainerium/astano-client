"use client"

import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"
import type { PublicProduct } from "@/types/storefront"

const money = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" })

/**
 * One product tile, matching the live grid.
 *
 * The price shown is whatever the API resolved for **this** visitor — guest,
 * retail or approved dealer — and is never recomputed here. Six surfaces
 * agreeing on a price is spec risk #1, and they agree because none of them
 * does its own arithmetic.
 *
 * A quote-only product shows "Preis auf Anfrage" and routes to the inquiry
 * basket instead of the cart (R2).
 */
export const ProductCard = ({ product }: { product: PublicProduct }) => {
	const t = useTranslations("shop")
	const image = product.featuredImage
	const thumb = image ? (image.srcset.grid ?? image.srcset.detail ?? image.url) : null

	return (
		<article className="group border border-transparent bg-white transition-colors hover:border-neutral-200">
			<Link
				href={{ pathname: "/products/[slug]", params: { slug: product.slug } }}
				className="bg-muted block aspect-square overflow-hidden"
			>
				{thumb ? (
					// eslint-disable-next-line @next/next/no-img-element
					<img
						src={thumb}
						alt={product.name}
						loading="lazy"
						className="size-full object-contain transition-transform duration-300 group-hover:scale-105"
					/>
				) : (
					<div className="text-muted-foreground flex size-full items-center justify-center text-xs">
						{t("noImage")}
					</div>
				)}
			</Link>

			<div className="space-y-1.5 p-4">
				<Link
					href={{ pathname: "/products/[slug]", params: { slug: product.slug } }}
					className="hover:text-primary block text-sm leading-snug font-medium transition-colors"
				>
					{product.name}
				</Link>

				{!!product.categories.length && (
					<p className="text-muted-foreground text-xs">
						{product.categories.map((c) => c.name).join(", ")}
					</p>
				)}

				<div className="pt-1">
					{product.quoteOnly ? (
						<p className="text-muted-foreground text-sm italic">{t("priceOnRequest")}</p>
					) : product.priceFrom ? (
						<p className="text-sm font-semibold">
							{money.format(Number(product.priceFrom))}
							<span className="text-muted-foreground ml-1 text-xs font-normal">
								{t("exclVat")}
							</span>
						</p>
					) : (
						<p className="text-muted-foreground text-sm">—</p>
					)}
				</div>

				<Link
					href={
						product.quoteOnly
							? "/quote-basket"
							: { pathname: "/products/[slug]", params: { slug: product.slug } }
					}
					className="bg-primary text-primary-foreground mt-3 block px-4 py-2.5 text-center text-xs font-semibold tracking-wide uppercase transition-opacity hover:opacity-90"
				>
					{product.quoteOnly ? t("addToQuote") : t("addToCart")}
				</Link>
			</div>
		</article>
	)
}

export default ProductCard
