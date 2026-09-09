"use client"

import { useTranslations } from "next-intl"
import { Loader2 } from "lucide-react"
import { Link } from "@/i18n/navigation"
import { useShopProductsQuery } from "@/redux/api/storefrontApi"
import ProductCard from "./ProductCard"

/** The live grid runs 4 across, 3 deep. */
const LIMIT = 12

/**
 * The products the shop chose to lead with.
 *
 * This used to be the first twelve of the whole catalogue: no filter, and an
 * ORDER BY over a column every product carried 0 in. Which twelve appeared,
 * and in what order, was therefore Postgres's decision rather than anybody's
 * — on the page a customer sees first.
 *
 * `top` names the set and `sort: "default"` arranges it by the sort order
 * beside the tick in the editor, so both halves of the choice are the shop's.
 * Twelve is still the ceiling and not a quota: ticking fewer shows fewer, and
 * the grid reflows.
 */
export const PopularProducts = () => {
	const t = useTranslations("home.popular")
	const { data, isLoading } = useShopProductsQuery({ limit: LIMIT, sort: "default", top: "true" })

	const products = data?.data ?? []

	/**
	 * Nothing chosen means nothing here — not a heading over an apology.
	 *
	 * "Noch keine Produkte veröffentlicht" was written when the strip was the
	 * first twelve of the catalogue and empty meant the shop had no products at
	 * all. The shop picks these by hand now, so empty means it picked none —
	 * a state it can reach in one click from the dashboard, and one where a
	 * heading, an empty band and a "view all products" button is a section that
	 * reads as broken rather than as absent.
	 *
	 * Held until the fetch is done, so the section does not appear, vanish and
	 * come back on every load.
	 */
	if (!isLoading && !products.length) return null

	return (
		<section className="mx-auto w-full max-w-[1400px] px-6 pb-16">
			<h2 className="font-heading text-center text-3xl font-extrabold tracking-tight uppercase sm:text-4xl">
				{t("heading")}
			</h2>

			{isLoading ? (
				<div className="text-muted-foreground flex items-center justify-center gap-2 py-20 text-sm">
					<Loader2 className="size-4 animate-spin" />
				</div>
			) : (
				<div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
					{products.map((product) => (
						<ProductCard key={product.id} product={product} />
					))}
				</div>
			)}

			<div className="mt-12 flex justify-center">
				<Link
					href="/products"
					className="bg-ink text-ink-foreground px-8 py-3.5 text-sm font-semibold tracking-wide uppercase transition-opacity hover:opacity-90"
				>
					{t("cta")}
				</Link>
			</div>
		</section>
	)
}

export default PopularProducts
