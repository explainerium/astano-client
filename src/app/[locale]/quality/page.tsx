import { getTranslations } from "next-intl/server"
import SiteFooter from "@/components/shared/footer/SiteFooter"
import SiteHeader from "@/components/shared/header/SiteHeader"
import { Link } from "@/i18n/navigation"
import { QUALITY_ICONS, QUALITY_IMAGES } from "@/lib/wpMedia"

interface Card {
	title: string
	body: string
}

/** All four call-to-action buttons on the page point at the product listing. */
const Cta = ({ children }: { children: React.ReactNode }) => (
	<Link
		href="/products"
		className="bg-primary text-primary-foreground inline-flex px-8 py-3.5 text-sm font-semibold tracking-wide uppercase transition-opacity hover:opacity-90"
	>
		{children}
	</Link>
)

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
	const { locale } = await params
	const t = await getTranslations({ locale, namespace: "quality" })
	return { title: t("title"), description: t("intro") }
}

/**
 * Qualität / Quality, rebuilt from the live page (post 521 DE / 2356 EN).
 *
 * The two language versions have drifted apart in WordPress and this
 * reconciles them:
 *
 *  - The English page carries an extra four-card section under the heading
 *    "Share your favorite music with friends!" — leftover demo text over what
 *    is otherwise real astano copy. There is no German equivalent, so the
 *    section is left out until the German text exists.
 *  - The German heading splits a compound noun ("Qualitätssicherungs
 *    prozess"); it is joined in the message catalogue.
 *  - The QA photograph appears only on the German page. It is used for both.
 *
 * The four QA steps carry the same check icon four times over on the live
 * site. They are numbered here instead — it is a sequence, and four identical
 * ticks say nothing the numbers do not say better.
 */
export default async function QualityPage({ params }: { params: Promise<{ locale: string }> }) {
	const { locale } = await params
	const t = await getTranslations({ locale, namespace: "quality" })
	const cards = t.raw("meaning.cards") as Card[]
	const steps = t.raw("process.steps") as Card[]

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
						<div className="mt-9">
							<Cta>{t("heroCta")}</Cta>
						</div>
					</div>
				</section>

				<section className="mx-auto w-full max-w-[1400px] px-6 py-16">
					<h2 className="font-heading text-center text-3xl font-extrabold tracking-tight sm:text-4xl">
						{t("meaning.title")}
					</h2>

					<div className="mt-12 grid gap-6 md:grid-cols-3">
						{cards.map((card, index) => (
							<article key={index} className="bg-muted p-8">
								{/* eslint-disable-next-line @next/next/no-img-element */}
								<img
									src={QUALITY_ICONS[index]}
									alt=""
									loading="lazy"
									className="size-9 object-contain"
								/>
								<h3 className="font-heading mt-6 text-lg leading-snug font-semibold">
									{card.title}
								</h3>
								<p className="text-muted-foreground mt-3 text-sm leading-relaxed">{card.body}</p>
							</article>
						))}
					</div>
				</section>

				<section className="bg-muted/50">
					<div className="mx-auto grid w-full max-w-[1400px] gap-12 px-6 py-16 lg:grid-cols-2 lg:items-center">
						<div>
							<h2 className="font-heading text-3xl font-extrabold tracking-tight sm:text-4xl">
								{t("process.title")}
							</h2>

							<ol className="mt-10 space-y-8">
								{steps.map((step, index) => (
									<li key={index} className="flex gap-5">
										<span
											aria-hidden
											className="bg-primary text-primary-foreground flex size-9 shrink-0 items-center justify-center text-sm font-bold"
										>
											{index + 1}
										</span>
										<div>
											<h3 className="font-heading text-base font-semibold">{step.title}</h3>
											<p className="text-muted-foreground mt-2 text-sm leading-relaxed">
												{step.body}
											</p>
										</div>
									</li>
								))}
							</ol>

							<div className="mt-10">
								<Cta>{t("process.cta")}</Cta>
							</div>
						</div>

						{/* eslint-disable-next-line @next/next/no-img-element */}
						<img
							src={QUALITY_IMAGES[0]}
							alt=""
							loading="lazy"
							className="aspect-[4/5] w-full object-cover"
						/>
					</div>
				</section>

				<section className="relative isolate">
					{/* eslint-disable-next-line @next/next/no-img-element */}
					<img
						src={QUALITY_IMAGES[1]}
						alt=""
						loading="lazy"
						className="absolute inset-0 -z-10 size-full object-cover"
					/>
					<div className="-z-10 absolute inset-0 bg-neutral-900/75" />

					<div className="mx-auto w-full max-w-[900px] px-6 py-24 text-center">
						<h2 className="font-heading text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
							{t("promise.title")}
						</h2>
						<p className="mt-6 text-sm leading-relaxed text-white/80 sm:text-base">
							{t("promise.body")}
						</p>
						<div className="mt-9">
							<Cta>{t("promise.cta")}</Cta>
						</div>
					</div>
				</section>
			</main>

			<SiteFooter locale={locale} />
		</>
	)
}
