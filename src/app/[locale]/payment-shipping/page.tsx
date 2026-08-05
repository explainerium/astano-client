import { getTranslations } from "next-intl/server"
import { Check } from "lucide-react"
import SiteFooter from "@/components/shared/footer/SiteFooter"
import SiteHeader from "@/components/shared/header/SiteHeader"
import { Link } from "@/i18n/navigation"

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
	const { locale } = await params
	const t = await getTranslations({ locale, namespace: "payment" })
	return { title: t("title"), description: t("shipping.countries") }
}

/**
 * Zahlung & Versand / Payment & Shipping — post 4423.
 *
 * The live site has this page in German only. English is our default locale,
 * so the English text here is a translation rather than a port. It states
 * contractual terms — delivery countries, the 14-day invoice window, transit
 * times — so it is worth a native read before launch.
 *
 * The country list is also duplicated business logic: it must agree with the
 * shipping zones configured under /admin/dashboard/shipping, and the page will
 * not update itself when those change.
 */
export default async function PaymentShippingPage({
	params,
}: {
	params: Promise<{ locale: string }>
}) {
	const { locale } = await params
	const t = await getTranslations({ locale, namespace: "payment" })
	const methods = t.raw("terms.methods") as string[]

	return (
		<>
			<SiteHeader locale={locale} />

			<main className="flex-1">
				<section className="bg-neutral-900">
					<div className="mx-auto w-full max-w-[1400px] px-6 py-16 text-center">
						<h1 className="font-heading text-3xl font-extrabold tracking-tight text-white uppercase sm:text-4xl">
							{t("title")}
						</h1>
					</div>
				</section>

				<div className="mx-auto grid w-full max-w-[1400px] gap-12 px-6 py-16 lg:grid-cols-2">
					<section>
						<h2 className="font-heading text-2xl font-extrabold tracking-tight sm:text-3xl">
							{t("shipping.title")}
						</h2>

						<div className="[&>p]:text-muted-foreground mt-6 space-y-4 [&>p]:text-sm [&>p]:leading-relaxed">
							<p>{t("shipping.intro")}</p>
							<p>{t("shipping.countries")}</p>
							<p>{t("shipping.islands")}</p>
							<h3 className="font-heading pt-2 text-base font-semibold">
								{t("shipping.domesticLabel")}
							</h3>
							<p>{t("shipping.domestic")}</p>
							<h3 className="font-heading pt-2 text-base font-semibold">
								{t("shipping.abroadLabel")}
							</h3>
							<p>{t("shipping.abroad")}</p>
							<p>{t("shipping.carriers")}</p>
						</div>
					</section>

					<section>
						<h2 className="font-heading text-2xl font-extrabold tracking-tight sm:text-3xl">
							{t("terms.title")}
						</h2>

						<h3 className="font-heading mt-6 text-base font-semibold">
							{t("terms.methodsTitle")}
						</h3>
						<ul className="mt-3 space-y-2">
							{methods.map((method) => (
								<li key={method} className="flex items-start gap-3">
									<Check className="text-primary mt-0.5 size-5 shrink-0" strokeWidth={2.5} />
									<span className="text-sm leading-relaxed">{method}</span>
								</li>
							))}
						</ul>

						<h3 className="font-heading mt-8 text-base font-semibold">
							{t("terms.detailsTitle")}
						</h3>
						<div className="[&>p]:text-muted-foreground mt-3 space-y-4 [&>p]:text-sm [&>p]:leading-relaxed">
							<p>{t("terms.invoice")}</p>
							<p>{t("terms.due")}</p>
						</div>

						<p className="text-muted-foreground mt-6 text-sm leading-relaxed">
							{t("terms.contact")}{" "}
							<Link href="/contact" className="text-primary underline underline-offset-2">
								{locale === "de" ? "Zum Kontaktformular" : "Go to the contact form"}
							</Link>
						</p>
					</section>
				</div>

				<section className="bg-muted/50">
					<div className="mx-auto w-full max-w-[1400px] px-6 py-16">
						<h2 className="font-heading text-2xl font-extrabold tracking-tight sm:text-3xl">
							{t("times.title")}
						</h2>
						<div className="[&>p]:text-muted-foreground mt-6 max-w-4xl space-y-4 [&>p]:text-sm [&>p]:leading-relaxed">
							<p>{t("times.custom")}</p>
							<p>{t("times.standard")}</p>
						</div>
					</div>
				</section>
			</main>

			<SiteFooter locale={locale} />
		</>
	)
}
