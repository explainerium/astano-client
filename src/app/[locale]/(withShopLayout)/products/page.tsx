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
 * **Do not wrap <ProductListing /> in <Suspense>.** It looks like it should be
 * — the listing reads the query string with useSearchParams, and that is the
 * boundary Next asks for. It is not needed here and it silently breaks the
 * page.
 *
 * Next only demands that boundary when a route is *statically prerendered*;
 * every route in this app is dynamic (next-intl's [locale] segment sees to
 * that), so there is nothing to opt out of. With the boundary in place the
 * server renders the listing correctly, ships the HTML — and React then never
 * hydrates that subtree. No error, no warning: the filters, the sort box and
 * the grid are inert markup, the products request is never sent, and the page
 * sits on "Loading…" for ever. Removing the boundary makes it work.
 *
 * The same applies to the category archive, which renders the same component.
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

			<ProductListing />
		</>
	)
}
