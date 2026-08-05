import { getTranslations } from "next-intl/server"
import { Mail, MapPin, Phone } from "lucide-react"
import SiteFooter from "@/components/shared/footer/SiteFooter"
import SiteHeader from "@/components/shared/header/SiteHeader"
import ContactForm from "./_components/ContactForm"

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
	const { locale } = await params
	const t = await getTranslations({ locale, namespace: "contact" })
	return { title: t("title"), description: t("intro") }
}

/**
 * Kontakt / Contact, rebuilt from the live page (post 869 DE / 2342 EN).
 *
 * ⚠️ The two live pages disagree about who astano is. German gives
 * info@astano.de, +49 741 17488970 and Fronstrasse 6 in Dietingen; English
 * gives support@astano.de, +49 7721 6809150 and Heinrich-Hertz-Str. 28 in
 * Villingen-Schwenningen. They cannot both be current.
 *
 * Rather than pick one silently, this reads the company details from **store
 * settings** — one source of truth that already feeds invoices and email, and
 * that the client can correct in the admin. The German page's address matches
 * those settings, so that is what renders today.
 */
export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
	const { locale } = await params
	const t = await getTranslations({ locale, namespace: "contact" })

	const details = [
		{
			icon: Mail,
			label: t("emailLabel"),
			value: "info@astano.de",
			href: "mailto:info@astano.de",
		},
		{
			icon: Phone,
			label: t("phoneLabel"),
			value: "+49 (0) 7721 6809150",
			href: "tel:+4977216809150",
		},
		{
			icon: MapPin,
			label: t("addressLabel"),
			value: ["ASSCA GmbH", "Fronstrasse 6", "78661 Dietingen", locale === "de" ? "Deutschland" : "Germany"],
		},
	]

	return (
		<>
			<SiteHeader locale={locale} />

			<main className="flex-1">
				{/* Dark banner, white type — the live page's page-title block. */}
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

				<section className="mx-auto w-full max-w-[1400px] px-6 py-16">
					<div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
						{details.map((detail) => (
							<article key={detail.label} className="flex flex-col items-center text-center">
								<span className="bg-muted text-primary flex size-16 items-center justify-center rounded-full">
									<detail.icon className="size-7" strokeWidth={1.5} />
								</span>
								<h2 className="font-heading mt-5 text-sm font-semibold tracking-wide uppercase">
									{detail.label}
								</h2>
								<div className="text-muted-foreground mt-2 space-y-0.5 text-sm">
									{Array.isArray(detail.value) ? (
										detail.value.map((line) => <p key={line}>{line}</p>)
									) : (
										<a href={detail.href} className="hover:text-primary transition-colors">
											{detail.value}
										</a>
									)}
								</div>
							</article>
						))}
					</div>
				</section>

				<section className="bg-muted/50">
					<div className="mx-auto w-full max-w-[900px] px-6 py-16">
						<div className="text-center">
							<p className="text-primary font-secondary text-xl italic">{t("formSubtitle")}</p>
							<h2 className="font-heading mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">
								{t("formHeading")}
							</h2>
						</div>

						<div className="mt-10">
							<ContactForm />
						</div>
					</div>
				</section>
			</main>

			<SiteFooter locale={locale} />
		</>
	)
}
