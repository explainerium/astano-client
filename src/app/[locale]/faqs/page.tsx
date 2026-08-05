import { getTranslations } from "next-intl/server"
import SiteFooter from "@/components/shared/footer/SiteFooter"
import SiteHeader from "@/components/shared/header/SiteHeader"
import { Link } from "@/i18n/navigation"
import FaqAccordion, { type FaqItem } from "./_components/FaqAccordion"

interface FaqGroup {
	title: string
	items: FaqItem[]
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
	const { locale } = await params
	const t = await getTranslations({ locale, namespace: "faq" })
	return { title: t("title"), description: t("intro") }
}

/**
 * FAQs, rebuilt from the live page (post 614 DE / 2376 EN).
 *
 * Nine questions in three groups. The copy was extracted straight from the
 * Elementor payload rather than retyped, so both languages say exactly what
 * WordPress says today.
 *
 * A FAQPage JSON-LD block goes out with it. The live site does not emit one,
 * which means these nine answers are invisible to the rich results that FAQ
 * pages exist to win — cheap to fix while the content is already structured.
 */
export default async function FaqPage({ params }: { params: Promise<{ locale: string }> }) {
	const { locale } = await params
	const t = await getTranslations({ locale, namespace: "faq" })
	const groups = t.raw("groups") as FaqGroup[]

	const jsonLd = {
		"@context": "https://schema.org",
		"@type": "FAQPage",
		mainEntity: groups.flatMap((group) =>
			group.items.map((item) => ({
				"@type": "Question",
				name: item.q,
				acceptedAnswer: { "@type": "Answer", text: item.a },
			}))
		),
	}

	return (
		<>
			<SiteHeader locale={locale} />

			<main className="flex-1">
				<section className="bg-neutral-900">
					<div className="mx-auto w-full max-w-[1400px] px-6 py-20 text-center">
						<h1 className="font-heading text-3xl font-extrabold tracking-tight text-white uppercase sm:text-4xl">
							{t("title")}
						</h1>
						<p className="mx-auto mt-5 max-w-3xl text-sm leading-relaxed text-white/80 sm:text-base">
							{t("intro")}
						</p>
					</div>
				</section>

				<div className="mx-auto w-full max-w-[900px] space-y-14 px-6 py-16">
					{groups.map((group, index) => (
						<section key={index}>
							<h2 className="font-heading mb-6 text-2xl font-extrabold tracking-tight sm:text-3xl">
								{group.title}
							</h2>
							<FaqAccordion id={`faq-${index}`} items={group.items} />
						</section>
					))}

					<aside className="bg-muted/60 border p-8 text-center">
						<p className="text-sm">
							{locale === "de"
								? "Ihre Frage ist nicht dabei?"
								: "Cannot find your question here?"}
						</p>
						<Link
							href="/contact"
							className="bg-primary text-primary-foreground mt-4 inline-flex px-7 py-3 text-sm font-semibold tracking-wide uppercase transition-opacity hover:opacity-90"
						>
							{locale === "de" ? "Kontaktieren Sie uns" : "Contact us"}
						</Link>
					</aside>
				</div>
			</main>

			<SiteFooter locale={locale} />

			<script
				type="application/ld+json"
				// The content is our own message catalogue, not user input.
				dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
			/>
		</>
	)
}
