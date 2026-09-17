import type { Metadata } from "next"
import { notFound } from "next/navigation"
import ProductDetail from "./_components/ProductDetail"

interface ProductHead {
	name?: string
	metaTitle?: string | null
	metaDescription?: string | null
	shortDescription?: string | null
}

/**
 * Fetches a product by its per-locale slug.
 *
 * Called by both `generateMetadata` and the page, as the category archive does.
 * Next dedupes identical fetches within a render pass, so this is one request.
 *
 * Returns null rather than throwing: an unknown slug is an expected outcome on
 * a public URL, not a fault — and a metadata lookup must never take the page
 * down with it.
 */
const getProduct = async (slug: string, locale: string): Promise<ProductHead | null> => {
	const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1"

	try {
		const response = await fetch(`${base}/products/${slug}`, {
			headers: { "Accept-Language": locale },
			next: { revalidate: 300 },
		})
		if (!response.ok) return null

		const { data } = (await response.json()) as { data?: ProductHead }
		return data ?? null
	} catch {
		return null
	}
}

/**
 * Per-product metadata, fetched server-side so crawlers and link previews see
 * the real title rather than the site default.
 *
 * The price is deliberately not in the metadata: it varies by role, and a
 * cached meta description quoting a dealer rate to a guest is exactly the
 * failure spec risk #1 warns about.
 */
export async function generateMetadata({
	params,
}: {
	params: Promise<{ locale: string; slug: string }>
}): Promise<Metadata> {
	const { locale, slug } = await params
	const product = await getProduct(slug, locale)
	if (!product) return {}

	return {
		title: product.metaTitle || product.name,
		description: product.metaDescription || product.shortDescription || undefined,
	}
}

export default async function ProductPage({
	params,
}: {
	params: Promise<{ locale: string; slug: string }>
}) {
	const { locale, slug } = await params

	/*
	 * An unknown slug answers a real 404.
	 *
	 * It used to render the shell and let the client component say "not found"
	 * inside a page that had already returned 200 — so a crawler was told the
	 * page exists, and the URL of a deleted or renamed product stayed indexed
	 * as a live but empty page. The category archive resolves its slug on the
	 * server for exactly this reason (rule R13); this is the same rule applied
	 * to the product it points at.
	 *
	 * The component still fetches for itself: it needs the price, the options
	 * and the gallery, none of which belong in a metadata lookup.
	 */
	if (!(await getProduct(slug, locale))) notFound()

	return <ProductDetail slug={slug} />
}
