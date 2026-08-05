"use client"

import { useTranslations } from "next-intl"
import { CUSTOM_ICONS } from "@/lib/wpMedia"

/**
 * "Sonderanfertigungen" — heading on the left, intro paragraph on the right,
 * four grey cards beneath. This is the section that sells the bespoke service,
 * which is the whole reason the configurator and the quote basket exist.
 */
export const CustomMade = () => {
	const t = useTranslations("home.custom")
	const cards = t.raw("cards") as { title: string; body: string }[]

	return (
		<section className="mx-auto w-full max-w-[1400px] px-6 py-16">
			<div className="grid gap-8 lg:grid-cols-2 lg:items-start">
				<h2 className="font-heading text-4xl font-extrabold tracking-tight sm:text-5xl">
					{t("heading")}
				</h2>
				<p className="text-muted-foreground text-sm leading-relaxed">{t("intro")}</p>
			</div>

			<div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
				{cards.map((card, i) => (
					<article key={i} className="bg-muted p-6">
						{/* eslint-disable-next-line @next/next/no-img-element */}
						<img src={CUSTOM_ICONS[i]} alt="" loading="lazy" className="size-8 object-contain" />
						<h3 className="font-heading mt-5 text-base leading-snug font-semibold">
							{card.title}
						</h3>
						<p className="text-muted-foreground mt-3 text-sm leading-relaxed">{card.body}</p>
					</article>
				))}
			</div>
		</section>
	)
}

export default CustomMade
