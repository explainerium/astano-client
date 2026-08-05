import type { ReactNode } from "react"
import { getTranslations } from "next-intl/server"
import SiteFooter from "@/components/shared/footer/SiteFooter"
import SiteHeader from "@/components/shared/header/SiteHeader"
import AccountNav from "./_components/AccountNav"

/**
 * Chrome for the customer's account area.
 *
 * `proxy.ts` already guards every /account path, so nothing here re-checks the
 * session — a signed-out visitor never reaches this layout.
 */
export default async function AccountLayout({
	children,
	params,
}: {
	children: ReactNode
	params: Promise<{ locale: string }>
}) {
	const { locale } = await params
	const t = await getTranslations({ locale, namespace: "account" })

	return (
		<>
			<SiteHeader locale={locale} />

			<main className="flex-1">
				<section className="bg-neutral-900">
					<div className="mx-auto w-full max-w-[1400px] px-6 py-12">
						<h1 className="font-heading text-2xl font-extrabold tracking-tight text-white uppercase sm:text-3xl">
							{t("title")}
						</h1>
					</div>
				</section>

				<div className="mx-auto grid w-full max-w-[1400px] gap-10 px-6 py-12 lg:grid-cols-[240px_1fr] lg:items-start">
					<AccountNav />
					<div>{children}</div>
				</div>
			</main>

			<SiteFooter locale={locale} />
		</>
	)
}
