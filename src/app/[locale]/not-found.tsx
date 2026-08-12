import { getLocale, getTranslations } from "next-intl/server"
import { Link } from "@/i18n/navigation"
import SiteFooter from "@/components/shared/footer/SiteFooter"
import SiteHeader from "@/components/shared/header/SiteHeader"

/**
 * The 404 for a real page of the shop — a product that has gone, a category
 * slug that was renamed.
 *
 * Separate from the root `not-found.tsx`, and both are needed. This one sits
 * inside `[locale]/layout.tsx`, so the document is already open and it must
 * *not* render `<html>`; the root one sits above every layout and must. Without
 * this file, a missing product would fall through to the root version and try
 * to open a second document inside the first.
 *
 * It carries the header and footer itself. A not-found replaces everything
 * below the layout it belongs to, so the `(withShopLayout)` chrome that a
 * product page had is gone by the time this renders.
 */
export default async function LocaleNotFound() {
	const locale = await getLocale()
	const t = await getTranslations("error")

	return (
		<>
			<SiteHeader locale={locale} />

			<main className="flex flex-1 items-center justify-center px-6 py-24">
				<div className="text-center">
					<p className="font-heading text-primary text-sm font-semibold tracking-[0.2em] uppercase">
						404
					</p>

					<h1 className="font-heading mt-4 text-3xl font-extrabold tracking-tight uppercase sm:text-4xl">
						{t("notFoundTitle")}
					</h1>

					<p className="text-muted-foreground mx-auto mt-4 max-w-prose text-sm leading-relaxed">
						{t("notFoundBody")}
					</p>

					<div className="mt-8 flex flex-wrap items-center justify-center gap-3">
						<Link
							href="/"
							className="bg-primary text-primary-foreground inline-flex px-7 py-3 text-sm font-semibold tracking-wide uppercase transition-opacity hover:opacity-90"
						>
							{t("backHome")}
						</Link>
						<Link
							href="/products"
							className="border-input inline-flex border px-7 py-3 text-sm font-semibold tracking-wide uppercase transition-colors hover:bg-neutral-100"
						>
							{t("browseShop")}
						</Link>
					</div>
				</div>
			</main>

			<SiteFooter locale={locale} />
		</>
	)
}
