import { getTranslations } from "next-intl/server"
import SiteFooter from "@/components/shared/footer/SiteFooter"
import SiteHeader from "@/components/shared/header/SiteHeader"
import { Link } from "@/i18n/navigation"
import { DEALER_IMAGES } from "@/lib/wpMedia"

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
	const { locale } = await params
	const t = await getTranslations({ locale, namespace: "dealers" })
	return { title: t("title"), description: t("intro") }
}

/**
 * Händler / Dealers — post 4535.
 *
 * German only on the live site; the English here is a translation, since
 * English is our default locale.
 *
 * The four tiles are image-plus-caption on the live site — their banner links
 * all point at "#" and there is no body copy behind them. They are rendered
 * the same way here rather than invented into something they are not.
 */
export default async function DealersPage({ params }: { params: Promise<{ locale: string }> }) {
	const { locale } = await params
	const t = await getTranslations({ locale, namespace: "dealers" })
	const cards = t.raw("cards") as string[]

	return (
		<>
			<SiteHeader locale={locale} />

			<main className="flex-1">
				<section className="bg-neutral-900">
					<div className="mx-auto w-full max-w-[1400px] px-6 py-20 text-center">
						<h1 className="font-heading text-3xl font-extrabold tracking-tight text-white uppercase sm:text-4xl">
							{t("title")}
						</h1>
						<p className="mx-auto mt-6 max-w-3xl text-sm leading-relaxed text-white/80 sm:text-base">
							{t("intro")}
						</p>
						<Link
							href="/dealer-registration"
							className="bg-primary text-primary-foreground mt-9 inline-flex px-8 py-3.5 text-sm font-semibold tracking-wide uppercase transition-opacity hover:opacity-90"
						>
							{t("cta")}
						</Link>
					</div>
				</section>

				<section className="mx-auto w-full max-w-[1400px] px-6 py-16">
					<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
						{cards.map((card, index) => (
							<article key={index} className="group relative isolate overflow-hidden">
								{/* eslint-disable-next-line @next/next/no-img-element */}
								<img
									src={DEALER_IMAGES[index]}
									alt=""
									loading="lazy"
									className="aspect-[4/3.5] w-full object-cover transition-transform duration-500 group-hover:scale-105"
								/>
								<div className="absolute inset-0 bg-neutral-900/45" />
								<h2 className="font-heading absolute inset-x-0 bottom-0 p-5 text-base leading-snug font-semibold text-white">
									{card}
								</h2>
							</article>
						))}
					</div>
				</section>

				<section className="bg-muted/50">
					<div className="mx-auto w-full max-w-[900px] px-6 py-16 text-center">
						<p className="text-muted-foreground text-sm leading-relaxed sm:text-base">
							{t("intro")}
						</p>
						<Link
							href="/dealer-registration"
							className="bg-primary text-primary-foreground mt-8 inline-flex px-8 py-3.5 text-sm font-semibold tracking-wide uppercase transition-opacity hover:opacity-90"
						>
							{t("cta")}
						</Link>
					</div>
				</section>
			</main>

			<SiteFooter locale={locale} />
		</>
	)
}
