"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { ExternalLink, Loader2 } from "lucide-react"
import { toast } from "sonner"
import ProForm from "@/components/form/ProForm"
import ProInput from "@/components/form/ProInput"
import ProRichText from "@/components/form/ProRichText"
import ProSubmit from "@/components/form/ProSubmit"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { LegalDocument } from "@/content/legal"
import { getPathname } from "@/i18n/navigation"
import { locales } from "@/i18n/routing"
import { useContentPagesQuery, useSaveContentPagesMutation } from "@/redux/api/contentApi"
import useContentText from "./useContentText"

/**
 * Impressum, Datenschutz and AGB.
 *
 * Their own screen rather than a group of fields, because they are documents:
 * ten thousand words of headed, linked HTML rather than a heading and a
 * sentence. Everything else about them follows the same rules as the fields —
 * per language, ADMIN only, saved live, and falling back to the copy that
 * shipped when the shop has not rewritten one.
 *
 * `shipped` arrives from the server component above: the documents as they are
 * on the site today. Each box therefore opens on the real text, and an unedited
 * document reads as itself instead of as an empty page. Nothing is written for
 * one that is left alone — see the submit below.
 */

/** Where each document lives, derived so a renamed slug cannot orphan a link. */
const ROUTE_OF = {
	imprint: "/imprint",
	privacy: "/privacy",
	terms: "/terms",
} as const

const fieldName = (kind: string, slug: string, locale: string) => `${kind}__${slug}__${locale}`

export const LegalContentForm = ({ shipped }: { shipped: Record<string, LegalDocument> }) => {
	const t = useTranslations("admin")
	const c = useTranslations("adminCommon")
	const text = useContentText()
	const [activeLocale, setActiveLocale] = useState<string>(locales[0])
	const { data, isLoading, isError, error } = useContentPagesQuery()
	const [savePages] = useSaveContentPagesMutation()

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

	/** What is on the site right now: the shop's version, else what shipped. */
	const current = (slug: string, locale: string): LegalDocument => {
		const stored = data.pages[locale]?.[slug]
		if (stored) return { title: stored.title, html: stored.bodyHtml }
		return shipped[`${slug}.${locale}`] ?? { title: "", html: "" }
	}

	const defaults: Record<string, string> = {}
	for (const page of data.definitions) {
		for (const locale of locales) {
			const now = current(page.slug, locale)
			defaults[fieldName("title", page.slug, locale)] = now.title
			defaults[fieldName("body", page.slug, locale)] = now.html
		}
	}

	const onSubmit = async (form: Record<string, unknown>) => {
		/**
		 * Only documents somebody actually rewrote.
		 *
		 * Compared against what the box opened with, which for an untouched
		 * document is the shipped file — so pressing Save without editing writes
		 * nothing, and the three documents keep falling back rather than being
		 * frozen as copies. That matters more here than on the field screens: a
		 * copy taken today would silently stop tracking a correction made to the
		 * shipped text tomorrow.
		 */
		const pages = data.definitions.flatMap((page) =>
			locales.flatMap((locale) => {
				const title = String(form[fieldName("title", page.slug, locale)] ?? "").trim()
				const bodyHtml = String(form[fieldName("body", page.slug, locale)] ?? "")

				// A document emptied of both its title and its body is not an edit
				// anybody meant to make, and saving it would replace a complete
				// legal text with a blank page.
				if (!title) return []

				const now = current(page.slug, locale)
				if (now.title === title && now.html === bodyHtml) return []

				return [{ slug: page.slug, locale, title, bodyHtml }]
			})
		)

		if (!pages.length) {
			toast.info(t("nothingToSave"))
			return
		}

		try {
			await savePages({ pages }).unwrap()
			const cleared = await fetch("/api/content/revalidate", { method: "POST" })
				.then((r) => r.ok)
				.catch(() => false)
			toast.success(cleared ? c("saved") : t("savedButCacheNotCleared"))
		} catch (err) {
			const message = (err as { data?: { message?: string } })?.data?.message
			toast.error(message ?? c("saveFailed"))
		}
	}

	return (
		<div className="space-y-4">
			<div>
				<h2 className="font-heading text-base font-semibold">{t("legalDocuments")}</h2>
				<p className="text-muted-foreground mt-1 max-w-prose text-sm">
					{t("legalDocumentsBlurb")}
				</p>
			</div>

			<ProForm onSubmit={onSubmit} defaultValues={defaults} className="space-y-5">
				{data.definitions.map((page) => {
					const route = ROUTE_OF[page.slug as keyof typeof ROUTE_OF]

					return (
						<section key={page.slug} className="bg-card space-y-4 rounded-lg border p-5">
							<div className="flex flex-wrap items-start justify-between gap-3">
								<div>
									<h3 className="font-heading text-sm font-semibold">
										{text.label(page.slug, page.label)}
									</h3>
									<p className="text-muted-foreground mt-0.5 text-xs">{page.blurb}</p>
								</div>

								{route && (
									<a
										href={getPathname({ href: route, locale: "de" })}
										target="_blank"
										rel="noreferrer"
										className="text-primary inline-flex shrink-0 items-center gap-1.5 text-sm underline underline-offset-2"
									>
										{t("viewPage")}
										<ExternalLink className="size-3.5" />
									</a>
								)}
							</div>

							<Tabs value={activeLocale} onValueChange={setActiveLocale}>
								<TabsList>
									{locales.map((locale) => (
										<TabsTrigger key={locale} value={locale} className="uppercase">
											{locale}
										</TabsTrigger>
									))}
								</TabsList>

								{locales.map((locale) => (
									<TabsContent key={locale} value={locale} className="space-y-4 pt-4">
										<ProInput name={fieldName("title", page.slug, locale)} label={t("pageTitle")} />
										<ProRichText
											name={fieldName("body", page.slug, locale)}
											label={t("pageBody")}
											description={t("editedHereReplacesTheShippedDocument")}
										/>
									</TabsContent>
								))}
							</Tabs>
						</section>
					)
				})}

				<ProSubmit>{c("save")}</ProSubmit>
			</ProForm>
		</div>
	)
}

export default LegalContentForm
