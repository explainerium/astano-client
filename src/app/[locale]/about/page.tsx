import { getTranslations } from "next-intl/server"
import SiteFooter from "@/components/shared/footer/SiteFooter"
import SiteHeader from "@/components/shared/header/SiteHeader"
import { Link } from "@/i18n/navigation"
import { ABOUT_ICONS, ABOUT_IMAGES } from "@/lib/wpMedia"

interface Card {
	title: string
	body: string
}

/** The page's three call-to-action buttons, all styled alike. */
const Cta = ({
	href = "/products",
	children,
}: {
	href?: "/products" | "/custom"
	children: React.ReactNode
}) => (
	<Link
		href={href}
		className="bg-primary text-primary-foreground mt-8 inline-flex px-8 py-3.5 text-sm font-semibold tracking-wide uppercase transition-opacity hover:opacity-90"
	>
		{children}
	</Link>
)

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
	const { locale } = await params
	const t = await getTranslations({ locale, namespace: "about" })
	return { title: t("title"), description: t("intro") }
}

/**
 * Über uns / About Us, rebuilt from the live page (post 444 DE / 2348 EN).
 *
 * Both languages were extracted from the Elementor payload rather than
 * retyped. Two things in the source were deliberately not reproduced:
 *
 *  - The English page still carries a Woodmart demo testimonial ("Brooklyn
 *    Simmons / BARONE LLC", lorem body). It has no German counterpart and is
 *    template filler, not content.
 *  - The German "Sonderanfertigungen entdecken" button points at
 *    /de/de/de/de/de/sonderanfertigungen/ — a WPML prefix bug that 404s. It
 *    goes to /custom here, which is where it was meant to go; the other two
 *    buttons go to the product listing as they do on the live site.
 */
export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
	const { locale } = await params
	const t = await getTranslations({ locale, namespace: "about" })
	const cards = t.raw("cards") as Card[]

	return (
		<>
			<SiteHeader locale={locale} />

			<main className="flex-1">
				<section className="bg-neutral-900">
					<div className="mx-auto w-full max-w-[1400px] px-6 py-20 text-center">
						<h1 className="font-heading text-3xl font-extrabold tracking-tight text-white uppercase sm:text-4xl">
							{t("title")}
						</h1>
						<p className="mx-auto mt-6 max-w-4xl text-sm leading-relaxed text-white/80 sm:text-base">
							{t("intro")}
						</p>
						<Link
							href="/products"
							className="bg-primary text-primary-foreground mt-9 inline-flex px-8 py-3.5 text-sm font-semibold tracking-wide uppercase transition-opacity hover:opacity-90"
						>
							{t("heroCta")}
						</Link>
					</div>
				</section>

				<section className="mx-auto w-full max-w-[900px] px-6 py-16 text-center">
					<h2 className="font-heading text-3xl font-extrabold tracking-tight sm:text-4xl">
						{t("craft.title")}
					</h2>
					<p className="text-muted-foreground mt-6 text-sm leading-relaxed sm:text-base">
						{t("craft.body")}
					</p>
				</section>

				<section className="bg-muted/50">
					<div className="mx-auto grid w-full max-w-[1400px] gap-12 px-6 py-16 lg:grid-cols-2 lg:items-center">
						<div className="grid grid-cols-2 gap-4">
							{/* eslint-disable-next-line @next/next/no-img-element */}
							<img
								src={ABOUT_IMAGES[0]}
								alt=""
								loading="lazy"
								className="aspect-[3/4] w-full object-cover"
							/>
							{/* eslint-disable-next-line @next/next/no-img-element */}
							<img
								src={ABOUT_IMAGES[1]}
								alt=""
								loading="lazy"
								className="mt-10 aspect-[3/4] w-full object-cover"
							/>
						</div>

						<div>
							<h2 className="font-heading text-3xl font-extrabold tracking-tight sm:text-4xl">
								{t("quality.title")}
							</h2>
							<p className="text-muted-foreground mt-6 text-sm leading-relaxed sm:text-base">
								{t("quality.body")}
							</p>
							<Cta>{t("quality.cta")}</Cta>
						</div>
					</div>
				</section>

				<section className="mx-auto grid w-full max-w-[1400px] gap-12 px-6 py-16 lg:grid-cols-2 lg:items-center">
					<div className="lg:order-2">
						{/* eslint-disable-next-line @next/next/no-img-element */}
						<img
							src={ABOUT_IMAGES[2]}
							alt=""
							loading="lazy"
							className="aspect-[4/3] w-full object-cover"
						/>
					</div>

					<div className="lg:order-1">
						<h2 className="font-heading text-3xl font-extrabold tracking-tight sm:text-4xl">
							{t("practical.title")}
						</h2>
						<p className="text-muted-foreground mt-6 text-sm leading-relaxed sm:text-base">
							{t("practical.body")}
						</p>
						<Cta href="/custom">{t("practical.cta")}</Cta>
					</div>
				</section>

				<section className="mx-auto w-full max-w-[1400px] px-6 pb-20">
					<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
						{cards.map((card, index) => (
							<article key={index} className="bg-muted p-6">
								{/* eslint-disable-next-line @next/next/no-img-element */}
								<img
									src={ABOUT_ICONS[index]}
									alt=""
									loading="lazy"
									className="size-8 object-contain"
								/>
								<h3 className="font-heading mt-5 text-base leading-snug font-semibold">
									{card.title}
								</h3>
								<p className="text-muted-foreground mt-3 text-sm leading-relaxed">{card.body}</p>
							</article>
						))}
					</div>
				</section>
			</main>

			<SiteFooter locale={locale} />
		</>
	)
}
