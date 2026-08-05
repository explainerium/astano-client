import { Suspense } from "react"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { getTranslations } from "next-intl/server"
import type { PublicCategory } from "@/types/storefront"
import ProductListing from "../../products/_components/ProductListing"

/**
 * Fetches a category by its per-locale slug.
 *
 * Called by both `generateMetadata` and the page. Next dedupes identical
 * fetches within a render pass, so this is one request, not two.
 *
 * Returns null rather than throwing: a missing category is an expected outcome
 * on a public URL, not a fault.
 */
const getCategory = async (slug: string, locale: string): Promise<PublicCategory | null> => {
	const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1"

	try {
		const response = await fetch(`${base}/categories/${slug}`, {
			headers: { "Accept-Language": locale },
			next: { revalidate: 300 },
		})
		if (!response.ok) return null
		const { data } = (await response.json()) as { data?: PublicCategory }
		return data ?? null
	} catch {
		return null
	}
}

export async function generateMetadata({
	params,
}: {
	params: Promise<{ locale: string; slug: string }>
}): Promise<Metadata> {
	const { locale, slug } = await params
	const category = await getCategory(slug, locale)
	if (!category) return {}

	return { title: category.name, description: category.description ?? undefined }
}

/**
 * A category archive.
 *
 * The same listing as /products, given its category from the path rather than
 * the query string. Search, sort and paging still travel as query parameters,
 * so `/de/produkt-kategorie/ausstechformen?sort=price_asc&page=2` means exactly
 * what it reads as.
 *
 * The category is resolved on the server so an unknown or hidden slug answers a
 * real 404 (rule R13). Doing it after hydration would serve 200 to crawlers and
 * let a hidden category's URL look like a live but empty page.
 */
export default async function CategoryPage({
	params,
}: {
	params: Promise<{ locale: string; slug: string }>
}) {
	const { locale, slug } = await params

	const [category, t] = await Promise.all([
		getCategory(slug, locale),
		getTranslations({ locale, namespace: "shop" }),
	])

	if (!category) notFound()

	return (
		<>
			<section className="bg-neutral-900">
				<div className="mx-auto w-full max-w-[1400px] px-6 py-14 text-center">
					<h1 className="font-heading text-3xl font-extrabold tracking-tight text-white uppercase sm:text-4xl">
						{category.name}
					</h1>
					{category.description && (
						<p className="mx-auto mt-5 max-w-3xl text-sm leading-relaxed text-white/80">
							{category.description}
						</p>
					)}
				</div>
			</section>

			<Suspense
				fallback={<p className="text-muted-foreground py-24 text-center text-sm">{t("loading")}</p>}
			>
				<ProductListing category={slug} />
			</Suspense>
		</>
	)
}
