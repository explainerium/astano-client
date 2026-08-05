import { getTranslations } from "next-intl/server"
import { Check } from "lucide-react"
import SiteFooter from "@/components/shared/footer/SiteFooter"
import SiteHeader from "@/components/shared/header/SiteHeader"
import { Link } from "@/i18n/navigation"
import { CUSTOM_IMAGES, CUSTOM_WHY_ICONS } from "@/lib/wpMedia"

interface Step {
	title: string
	/** Absent where WordPress still holds demo filler instead of real copy. */
	body?: string
}

interface Card {
	title: string
	body: string
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
	const { locale } = await params
	const t = await getTranslations({ locale, namespace: "custom" })
	return { title: t("title"), description: t("intro") }
}

/**
 * Sonderanfertigung / Custom Orders, rebuilt from the live page
 * (post 925 DE / 2367 EN).
 *
 * This is the page the quote basket exists to serve, and it is also the page
 * where the two WordPress versions have drifted furthest apart:
 *
 *  - The four "how it works" boxes are stored column-major in Elementor, so
 *    reading the data in order gives idea -> production -> quote -> delivery.
 *    They are re-interleaved into the sequence the live grid actually shows.
 *  - English step two ("Production begins") still carries Woodmart demo text
 *    ("Strategy where you might find some utility"). It is dropped, and the
 *    step renders title-only until real copy exists — a visible gap beats
 *    shipping filler, and inventing the client's process is not our call.
 *  - The English second heading repeats "How it works"; German has "Warum es
 *    funktioniert" there, so English uses its equivalent.
 *  - English has a "Pricing and delivery" section whose three cards are titles
 *    with no body, and which German lacks entirely. Left out.
 */
export default async function CustomPage({ params }: { params: Promise<{ locale: string }> }) {
	const { locale } = await params
	const t = await getTranslations({ locale, namespace: "custom" })
	const steps = t.raw("how.steps") as Step[]
	const cards = t.raw("why.cards") as Card[]
	const items = t.raw("capabilities.items") as string[]

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
					</div>
				</section>

				<section className="mx-auto grid w-full max-w-[1400px] gap-12 px-6 py-16 lg:grid-cols-2 lg:items-center">
					<div>
						<h2 className="font-heading text-3xl font-extrabold tracking-tight sm:text-4xl">
							{t("lead.title")}
						</h2>
						<p className="text-muted-foreground mt-6 text-sm leading-relaxed sm:text-base">
							{t("lead.body")}
						</p>
					</div>

					<div className="grid grid-cols-2 gap-4">
						{CUSTOM_IMAGES.map((src, index) => (
							// eslint-disable-next-line @next/next/no-img-element
							<img
								key={src}
								src={src}
								alt=""
								loading="lazy"
								className={`aspect-[3/4] w-full object-cover ${index === 1 ? "mt-10" : ""}`}
							/>
						))}
					</div>
				</section>

				<section className="bg-muted/50">
					<div className="mx-auto w-full max-w-[1400px] px-6 py-16">
						<h2 className="font-heading text-center text-3xl font-extrabold tracking-tight sm:text-4xl">
							{t("how.title")}
						</h2>

						<ol className="mx-auto mt-12 grid max-w-5xl gap-x-10 gap-y-8 sm:grid-cols-2">
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
										{step.body && (
											<p className="text-muted-foreground mt-2 text-sm leading-relaxed">
												{step.body}
											</p>
										)}
									</div>
								</li>
							))}
						</ol>
					</div>
				</section>

				<section className="mx-auto w-full max-w-[1400px] px-6 py-16">
					<h2 className="font-heading text-center text-3xl font-extrabold tracking-tight sm:text-4xl">
						{t("why.title")}
					</h2>

					<div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
						{cards.map((card, index) => (
							<article key={index} className="bg-muted p-6">
								{/* eslint-disable-next-line @next/next/no-img-element */}
								<img
									src={CUSTOM_WHY_ICONS[index]}
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

				<section className="bg-muted/50">
					<div className="mx-auto w-full max-w-[900px] px-6 py-16">
						<h2 className="font-heading text-center text-3xl font-extrabold tracking-tight sm:text-4xl">
							{t("capabilities.title")}
						</h2>

						<ul className="mt-10 grid gap-4 sm:grid-cols-2">
							{items.map((item, index) => (
								<li key={index} className="flex items-start gap-3">
									<Check className="text-primary mt-0.5 size-5 shrink-0" strokeWidth={2.5} />
									<span className="text-sm leading-relaxed">{item}</span>
								</li>
							))}
						</ul>
					</div>
				</section>

				<section className="mx-auto w-full max-w-[900px] px-6 py-20 text-center">
					<h2 className="font-heading text-3xl font-extrabold tracking-tight sm:text-4xl">
						{t("cta.title")}
					</h2>
					<p className="text-muted-foreground mx-auto mt-6 text-sm leading-relaxed sm:text-base">
						{t("cta.body")}
					</p>
					<Link
						href="/contact"
						className="bg-primary text-primary-foreground mt-9 inline-flex px-8 py-3.5 text-sm font-semibold tracking-wide uppercase transition-opacity hover:opacity-90"
					>
						{t("cta.button")}
					</Link>
				</section>
			</main>

			<SiteFooter locale={locale} />
		</>
	)
}
