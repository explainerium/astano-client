import type { Metadata } from "next"
import ProductDetail from "./_components/ProductDetail"

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
	const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1"

	try {
		const response = await fetch(`${base}/products/${slug}`, {
			headers: { "Accept-Language": locale },
			next: { revalidate: 300 },
		})
		if (!response.ok) return {}

		const { data } = (await response.json()) as {
			data?: { name?: string; metaTitle?: string | null; metaDescription?: string | null; shortDescription?: string | null }
		}
		if (!data) return {}

		return {
			title: data.metaTitle ?? data.name,
			description: data.metaDescription ?? data.shortDescription ?? undefined,
		}
	} catch {
		// A metadata lookup must never take the page down with it.
		return {}
	}
}

export default async function ProductPage({
	params,
}: {
	params: Promise<{ locale: string; slug: string }>
}) {
	const { slug } = await params
	return <ProductDetail slug={slug} />
}
