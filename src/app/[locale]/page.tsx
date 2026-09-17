import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import SiteFooter from "@/components/shared/footer/SiteFooter"
import SiteHeader from "@/components/shared/header/SiteHeader"
import CategoryGrid from "./_components/CategoryGrid"
import CustomMade from "./_components/CustomMade"
import FeatureTiles from "./_components/FeatureTiles"
import Hero from "./_components/Hero"
import NewsletterSignup from "./_components/NewsletterSignup"
import PopularProducts from "./_components/PopularProducts"

/**
 * The home page, rebuilt from the live WordPress front page (post 62 DE /
 * 2299 EN) section for section.
 *
 * Every string comes from the message catalogue, so the German page carries the
 * copy WordPress actually has and the English page is its own translation
 * rather than a machine rendering of the German. The two genuinely diverge in
 * places — the four banner tiles say different things in each language on the
 * live site — and that divergence is preserved rather than tidied away.
 *
 * The catalogue sections fetch from our own API, so they show whatever is
 * really published. They will look thin until the real 56 products are entered
 * through the admin; that is expected, not something to paper over with
 * fixtures.
 *
 * Header and footer render here rather than in the locale layout on purpose:
 * the auth pages already have their own shell, so hoisting these would put two
 * headers on /login. They move up as soon as a shop layout exists.
 */
/**
 * The home page's own search title, when the shop has written one.
 *
 * It had none: the page inherited the site title and description from the
 * locale layout, which is a sensible default and not something anybody could
 * edit. Both keys are empty until somebody fills them in, and an empty one is
 * omitted here — so the layout's values stand exactly as they did before.
 *
 * `absolute`, because the layout appends the shop name to every other page's
 * title, and the home page's title already is the shop.
 */
export async function generateMetadata({
	params,
}: {
	params: Promise<{ locale: string }>
}): Promise<Metadata> {
	const { locale } = await params
	const seo = await getTranslations({ locale, namespace: "seo" })

	const title = seo("home.title")
	const description = seo("home.description")

	return {
		...(title ? { title: { absolute: title } } : {}),
		...(description ? { description } : {}),
	}
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
	const { locale } = await params

	return (
		<>
			<SiteHeader locale={locale} />

			<main className="flex-1">
				<Hero />
				<FeatureTiles />
				<CategoryGrid />
				<PopularProducts />
				<CustomMade />
				<NewsletterSignup />
			</main>

			<SiteFooter locale={locale} />
		</>
	)
}
