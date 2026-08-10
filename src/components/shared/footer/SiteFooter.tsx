"use client"

import type { ComponentProps } from "react"
import { useTranslations } from "next-intl"
import { useParams } from "next/navigation"
import { Mail, MapPin, Phone } from "lucide-react"
import { Link, usePathname } from "@/i18n/navigation"
import { usePublicSettingsQuery } from "@/redux/api/settingApi"

type LinkHref = ComponentProps<typeof Link>["href"]

const QUICKLINKS = [
	{ href: "/" as const, en: "Home", de: "Heim" },
	{ href: "/about" as const, en: "About us", de: "Über uns" },
	{ href: "/quality" as const, en: "Quality", de: "Qualität" },
	{ href: "/custom" as const, en: "Custom-made", de: "Sonderanfertigung" },
	{ href: "/dealers" as const, en: "Dealers", de: "Händler" },
	{ href: "/payment-shipping" as const, en: "Payment & shipping", de: "Zahlung & Versand" },
	{ href: "/faqs" as const, en: "FAQs", de: "Häufig gestellte Fragen" },
	{ href: "/contact" as const, en: "Contact", de: "Kontakt" },
	{ href: "/products" as const, en: "Product range", de: "Produktangebot" },
]

/** The three legally required pages, as the live footer lists them. */
const LEGAL = [
	{ href: "/terms" as const, en: "Terms and conditions", de: "Allgemeine Geschäftsbedingungen" },
	{ href: "/privacy" as const, en: "Privacy policy", de: "Datenschutzrichtlinie" },
	{ href: "/imprint" as const, en: "Imprint", de: "Impressum" },
]

export const SiteFooter = ({ locale }: { locale: string }) => {
	const t = useTranslations("home.footer")
	const pathname = usePathname()
	const params = useParams()
	const lang = locale === "de" ? "de" : "en"

	/*
	 * The contact block comes from the settings, not the markup.
	 *
	 * It was typed in here, which meant changing the phone number in Settings
	 * changed it on invoices and in emails and left the footer — the one place
	 * most customers actually look — showing the old one.
	 *
	 * The current values are the fallbacks, so an unconfigured shop still reads
	 * correctly rather than showing an empty address block.
	 */
	const { data: shopSettings } = usePublicSettingsQuery()
	const setting = (key: string, fallback: string) => {
		const value = shopSettings?.[key]
		return typeof value === "string" && value.trim() ? value.trim() : fallback
	}

	const country = setting("company.countryCode", "DE")

	const addressLines = [
		[setting("company.name", "ASSCA GmbH"), setting("company.street", "Fronstrasse 6")]
			.filter(Boolean)
			.join(", "),
		setting("company.street2", ""),
		`${setting("company.postcode", "78661")} ${setting("company.city", "Dietingen")}`.trim(),
		country === "DE" ? (lang === "de" ? "Deutschland" : "Germany") : country,
	].filter((line) => line.trim())

	const phone = setting("company.phone", "+49 (0) 7721 6809150")
	const email = setting("company.email", "info@astano.de")

	/**
	 * Stay on the current page when switching language, translated slug and all
	 * — /products/steel-straws becomes /de/produkt/edelstahl-strohhalme, not the
	 * home page. The cast is unavoidable: next-intl cannot prove at compile time
	 * that the params from the router satisfy whichever pathname is current.
	 */
	const sameRoute = { pathname, params } as unknown as LinkHref

	return (
		<footer className="mt-auto">
			<div className="bg-muted">
				<div className="mx-auto grid w-full max-w-[1400px] gap-10 px-6 py-14 md:grid-cols-2 lg:grid-cols-4">
					<div className="space-y-4">
						<div>
							<span className="font-heading block text-[26px] font-medium tracking-[0.02em] text-neutral-800">
								astano
							</span>
							<span className="text-muted-foreground mt-0.5 block text-[9px] tracking-[0.42em] uppercase">
								Simply Superior
							</span>
						</div>
						<p className="text-muted-foreground max-w-sm text-sm leading-relaxed">{t("about")}</p>
					</div>

					<nav>
						<h2 className="font-heading mb-4 text-lg font-semibold">{t("quicklinks")}</h2>
						<ul className="space-y-2.5 text-sm">
							{QUICKLINKS.map((item, index) => (
								<li key={index} className="flex items-start gap-2">
									<span className="text-primary mt-1.5 size-1.5 shrink-0 rounded-full bg-current" />
									<Link href={item.href} className="hover:text-primary transition-colors">
										{item[lang]}
									</Link>
								</li>
							))}
						</ul>
					</nav>

					<nav>
						<h2 className="font-heading mb-4 text-lg font-semibold">{t("legal")}</h2>
						<ul className="space-y-2.5 text-sm">
							{LEGAL.map((item, index) => (
								<li key={index} className="flex items-start gap-2">
									<span className="text-primary mt-1.5 size-1.5 shrink-0 rounded-full bg-current" />
									<Link href={item.href} className="hover:text-primary transition-colors">
										{item[lang]}
									</Link>
								</li>
							))}
						</ul>

						{/* WPML's language switcher, rebuilt on next-intl: the same route in
						    the other language, with its own translated slug. */}
						<div className="mt-6 space-y-2 text-sm">
							<Link
								href={sameRoute}
								locale="de"
								className="hover:text-primary block transition-colors"
							>
								Deutsch
							</Link>
							<Link
								href={sameRoute}
								locale="en"
								className="hover:text-primary block transition-colors"
							>
								English
							</Link>
						</div>
					</nav>

					<div>
						<h2 className="font-heading mb-4 text-lg font-semibold">{t("contactHeading")}</h2>
						<address className="space-y-4 text-sm not-italic">
							<div className="flex gap-3">
								<MapPin className="text-muted-foreground mt-0.5 size-4 shrink-0" />
								<div>
									<p className="font-medium">astano®</p>
									{addressLines.map((line) => (
										<p key={line} className="text-muted-foreground">
											{line}
										</p>
									))}
								</div>
							</div>
							{!!phone && (
								<div className="flex items-center gap-3">
									<Phone className="text-muted-foreground size-4 shrink-0" />
									{/* Spaces and brackets are for reading; the dial string is not. */}
									<a
										href={`tel:${phone.replace(/[^\d+]/g, "")}`}
										className="hover:text-primary transition-colors"
									>
										{phone}
									</a>
								</div>
							)}
							{!!email && (
								<div className="flex items-center gap-3">
									<Mail className="text-muted-foreground size-4 shrink-0" />
									<a href={`mailto:${email}`} className="hover:text-primary transition-colors">
										{email}
									</a>
								</div>
							)}
						</address>
					</div>
				</div>
			</div>

			<div className="bg-ink text-ink-foreground">
				<div className="mx-auto flex w-full max-w-[1400px] flex-wrap items-center gap-3 px-6 py-4 text-sm">
					<span>{t("designedBy")}</span>
					<span className="ml-auto">{t("copyright", { year: 2025 })}</span>
				</div>
			</div>
		</footer>
	)
}

export default SiteFooter
