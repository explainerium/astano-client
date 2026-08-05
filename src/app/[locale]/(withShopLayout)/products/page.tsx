import { Suspense } from "react"
import { getTranslations } from "next-intl/server"
import ProductListing from "./_components/ProductListing"

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
	const { locale } = await params
	const t = await getTranslations({ locale, namespace: "shop" })
	return { title: t("allProducts") }
}

/**
 * The shop archive.
 *
 * The listing reads its filters from the query string via useSearchParams,
 * which opts that subtree into client rendering — hence the Suspense boundary
 * Next requires around it.
 */
export default async function ProductsPage({ params }: { params: Promise<{ locale: string }> }) {
	const { locale } = await params
	const t = await getTranslations({ locale, namespace: "shop" })

	return (
		<>
			<section className="bg-neutral-900">
				<div className="mx-auto w-full max-w-[1400px] px-6 py-14 text-center">
					<h1 className="font-heading text-3xl font-extrabold tracking-tight text-white uppercase sm:text-4xl">
						{t("allProducts")}
					</h1>
				</div>
			</section>

			<Suspense
				fallback={<p className="text-muted-foreground py-24 text-center text-sm">{t("loading")}</p>}
			>
				<ProductListing />
			</Suspense>
		</>
	)
}
