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
