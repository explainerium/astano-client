"use client"

import type { ReactNode } from "react"
import { useTranslations } from "next-intl"
import { useParams } from "next/navigation"
import { ExternalLink, Loader2 } from "lucide-react"
import { getPathname } from "@/i18n/navigation"
import type { pathnames } from "@/i18n/routing"
import { useContentQuery } from "@/redux/api/contentApi"
import ContentGroupForm from "../_components/ContentGroupForm"
import TopProductsPanel from "../_components/TopProductsPanel"
import useContentText from "../_components/useContentText"

/**
 * A route that needs no parameters — which every marketing page is.
 *
 * Excluding the bracketed ones keeps `/products/[slug]` out of a map that has
 * no slug to give it, and keeps doing so when a new dynamic route is added.
 */
type StaticPathKey = Exclude<keyof typeof pathnames, `${string}[${string}`>

/**
 * Which page of the site each group writes.
 *
 * Internal route keys, not URLs — the German path is derived from the shared
 * `pathnames` map below rather than typed here. Deriving it is the same rule
 * proxy.ts follows for its guards, and for the same reason: a renamed slug
 * would otherwise leave a dead link behind with nothing to catch it. Written
 * out by hand, two of these were already wrong (`/qualitat` carries no umlaut
 * and `/sonderanfertigungen` is plural).
 *
 * `shell` has no page of its own — the header and footer are on all of them —
 * so it opens the home page like everything else.
 */
const PAGE_OF: Record<string, StaticPathKey> = {
	home: "/",
	about: "/about",
	custom: "/custom",
	quality: "/quality",
	dealers: "/dealers",
	faq: "/faqs",
	contact: "/contact",
	payment: "/payment-shipping",
	shell: "/",
	auth: "/login",
	product: "/products",
}

/**
 * What a section owns beyond its words, keyed by group and then by the
 * section's own name in the registry.
 *
 * The Popular products section carried only a heading and a link label, while
 * the thing it is a heading *for* — which twelve products appear under it —
 * was reachable nowhere but the editor of each individual product. The shop
 * asked for both halves in one place, so the picker is rendered inside the
 * section it belongs to rather than bolted above or below the page.
 *
 * The key is the English section name from contentRegistry.ts, not its German
 * translation: the registry is what the form iterates.
 */
const SECTION_EXTRAS: Record<string, Record<string, ReactNode>> = {
	home: { "Popular products": <TopProductsPanel /> },
}

/**
 * One page of the site.
 *
 * The group is a URL segment rather than a tab in local state, so a page can be
 * linked to — which is what the storefront's own "edit this page" button links
 * at.
 */
export default function ContentGroupPage() {
	const t = useTranslations("admin")
	const c = useTranslations("adminCommon")
	const { group } = useParams<{ group: string }>()
	const text = useContentText()
	const { data, isLoading, isError, error } = useContentQuery()

	if (isLoading) {
		return (
			<div className="bg-card text-muted-foreground flex items-center justify-center gap-2 rounded-lg border p-16 text-sm">
				<Loader2 className="size-4 animate-spin" />
				{t("loadingContent")}
			</div>
		)
	}

	if (isError || !data) {
		return (
			<div className="text-destructive bg-card rounded-lg border border-dashed p-16 text-center text-sm">
				{(error as { data?: { message?: string } })?.data?.message ?? c("loadFailed")}
			</div>
		)
	}

	const definition = data.groups.find((entry) => entry.id === group)

	if (!definition) {
		return (
			<div className="bg-card rounded-lg border border-dashed p-16 text-center text-sm">
				<p className="text-muted-foreground">{t("thatContentSectionDoesNotExist")}</p>
			</div>
		)
	}

	// German, because the dashboard runs in German and the shop's own language is
	// the one whose wording is being written.
	const route = PAGE_OF[group]
	const preview = route ? getPathname({ href: route, locale: "de" }) : undefined

	return (
		<div className="space-y-4">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div>
					<h2 className="font-heading text-base font-semibold">
						{text.groupTitle(group, definition.title)}
					</h2>
					<p className="text-muted-foreground mt-1 max-w-prose text-sm">
						{text.groupBlurb(group, definition.blurb)}
					</p>
				</div>

				{preview && (
					<a
						href={preview}
						target="_blank"
						rel="noreferrer"
						className="text-primary inline-flex shrink-0 items-center gap-1.5 text-sm underline underline-offset-2"
					>
						{t("viewPage")}
						<ExternalLink className="size-3.5" />
					</a>
				)}
			</div>

			<ContentGroupForm data={data} group={group} sectionExtras={SECTION_EXTRAS[group]} />
		</div>
	)
}
