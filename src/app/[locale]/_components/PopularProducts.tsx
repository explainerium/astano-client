"use client"

import { useTranslations } from "next-intl"
import { Loader2 } from "lucide-react"
import { Link } from "@/i18n/navigation"
import { useShopProductsQuery } from "@/redux/api/storefrontApi"
import ProductCard from "./ProductCard"

/** The live grid runs 4 across, 3 deep. */
const LIMIT = 12

export const PopularProducts = () => {
	const t = useTranslations("home.popular")
	const { data, isLoading } = useShopProductsQuery({ limit: LIMIT, sort: "default" })

	const products = data?.data ?? []

	return (
		<section className="mx-auto w-full max-w-[1400px] px-6 pb-16">
			<h2 className="font-heading text-center text-3xl font-extrabold tracking-tight uppercase sm:text-4xl">
				{t("heading")}
			</h2>

			{isLoading ? (
				<div className="text-muted-foreground flex items-center justify-center gap-2 py-20 text-sm">
					<Loader2 className="size-4 animate-spin" />
				</div>
			) : !products.length ? (
				<p className="text-muted-foreground py-16 text-center text-sm">{t("empty")}</p>
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
