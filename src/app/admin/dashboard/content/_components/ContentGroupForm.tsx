"use client"

import { useState, type ReactNode } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import ProForm from "@/components/form/ProForm"
import ProInput from "@/components/form/ProInput"
import ProSubmit from "@/components/form/ProSubmit"
import ProTextarea from "@/components/form/ProTextarea"
import CategoryAssetField from "@/app/admin/dashboard/categories/_components/CategoryAssetField"
import ContentListField from "./ContentListField"
import { useSaveContentMutation } from "@/redux/api/contentApi"
import { locales } from "@/i18n/routing"
import type { ContentDefinition, ContentResponse } from "@/types/content"
import deMessages from "../../../../../../messages/de.json"
import enMessages from "../../../../../../messages/en.json"
import useContentText from "./useContentText"

/**
 * One page of the site, edited.
 *
 * Which fields exist, what they are called and how they should be edited all
 * come from the API's registry. Adding one is an entry in contentRegistry.ts
 * and no change here — the same arrangement the settings and email screens use.
 *
 * ── Why both catalogues are imported ────────────────────────────────────────
 *
 * A field has to open showing the words that are on the site right now, and for
 * a key nobody has edited yet those words are the ones that shipped in
 * messages/{de,en}.json. The API cannot supply them: the defaults live in this
 * repo and the overrides live in the other one. So both catalogues are read
 * here directly.
 *
 * That is roughly ninety kilobytes of English added to a screen only an ADMIN
 * behind a login ever opens, and it buys the one thing this screen cannot be
 * useful without — an editor who can see what they are changing before they
 * change it.
 */

/** RHF reads a dot as a nested path, so the flat key has to lose its dots. */
const fieldName = (prefix: string, key: string) => `${prefix}__${key.split(".").join("_")}`

/**
 * Read a dotted path out of a shipped catalogue.
 *
 * A list comes back as JSON rather than as an empty string: the catalogue holds
 * it as an array, and the form carries every value as text. Serialising here is
 * what lets the list editor open on the questions that are on the site.
 */
const shipped = (messages: unknown, key: string): string => {
	let node: unknown = messages
	for (const step of key.split(".")) {
		if (node === null || typeof node !== "object") return ""
		node = (node as Record<string, unknown>)[step]
	}
	if (Array.isArray(node)) return JSON.stringify(node)
	return typeof node === "string" ? node : ""
}

const CATALOGUES: Record<string, unknown> = { de: deMessages, en: enMessages }

export const ContentGroupForm = ({
	data,
	group,
	sectionExtras,
}: {
	data: ContentResponse
	group: string
	/**
	 * Anything that belongs under a section but is not a catalogue string,
	 * keyed by the section's registry name.
	 *
	 * There is exactly one today — the home page's top products, which are the
	 * catalogue itself rather than words about it and save through a different
	 * API. Passing it in keeps this component what it has been: a form that
	 * builds itself from the registry and knows nothing about any particular
	 * page. Rendered at the foot of its section, so the screen still runs down
	 * the page the way a visitor meets it.
	 */
	sectionExtras?: Record<string, ReactNode>
}) => {
	const t = useTranslations("admin")
	const c = useTranslations("adminCommon")
	const text = useContentText()
	const [saveContent] = useSaveContentMutation()
	const [activeLocale, setActiveLocale] = useState<string>(locales[0])

	const entries = Object.entries(data.definitions).filter(([, d]) => d.group === group)
	const sections = [...new Set(entries.map(([, d]) => d.section))]

	/** What is on the site today: the shop's own words, else what shipped. */
	const current = (key: string, locale: string) =>
		data.entries[locale]?.[key] ?? shipped(CATALOGUES[locale], key)

	/**
	 * Languages left behind.
	 *
	 * Counted as "the shop has written this key in another language but not in
	 * this one", which is exactly the state tabs invite — you edit the German,
	 * the English is one click away, and one click is enough to forget. The
	 * badge is a note, never a block: leaving the English as it shipped is a
	 * legitimate choice, and only the person writing it knows whether it is.
	 */
	const behind = (locale: string) =>
		entries.filter(
			([key, d]) =>
				d.type !== "image" &&
				!data.entries[locale]?.[key] &&
				locales.some((other) => other !== locale && data.entries[other]?.[key])
		).length

	const defaults: Record<string, unknown> = {}
	for (const [key, definition] of entries) {
		if (definition.type === "image") {
			const stored = data.media[key]
			defaults[fieldName("img", key)] = stored?.assetId ?? null
			defaults[fieldName("imgPreview", key)] = stored?.url ?? shipped(CATALOGUES.de, key)
			continue
		}
		for (const locale of locales) defaults[fieldName(locale, key)] = current(key, locale)
	}

	const onSubmit = async (form: Record<string, unknown>) => {
		/**
		 * Only what actually changed.
		 *
		 * Sending every field would write an override row for all 231 keys the
		 * first time anybody pressed Save, and "overridden" would stop meaning
		 * anything — the shipped copy would be shadowed everywhere, and a later
		 * correction to it would never reach the site. Comparing against what
		 * the field opened with keeps the table to the words somebody typed.
		 */
		const changedEntries: { key: string; locale: string; value: string }[] = []
		const changedMedia: { key: string; assetId: string | null }[] = []

		for (const [key, definition] of entries) {
			if (definition.type === "image") {
				const next = (form[fieldName("img", key)] as string | null) ?? null
				if (next !== (data.media[key]?.assetId ?? null)) changedMedia.push({ key, assetId: next })
				continue
			}
			for (const locale of locales) {
				const next = String(form[fieldName(locale, key)] ?? "")
				if (next !== current(key, locale)) changedEntries.push({ key, locale, value: next })
			}
		}

		if (!changedEntries.length && !changedMedia.length) {
			toast.info(t("nothingToSave"))
			return
		}

		try {
			await saveContent({ entries: changedEntries, media: changedMedia }).unwrap()

			/**
			 * Clear the storefront's cache.
			 *
			 * Next's data cache is the storefront's, not the API's, so the save
			 * above cannot touch it. Without this the edit would sit behind the
			 * revalidate window while the editor reloaded the page wondering
			 * whether it had worked.
			 *
			 * A failure here is not a failed save — the words are stored either
			 * way, and the page catches up when the window expires. Say so rather
			 * than reporting a save that did happen as one that did not.
			 */
			const cleared = await fetch("/api/content/revalidate", { method: "POST" })
				.then((r) => r.ok)
				.catch(() => false)

			toast.success(cleared ? c("saved") : t("savedButCacheNotCleared"))
		} catch (error) {
			const message = (error as { data?: { message?: string } })?.data?.message
			toast.error(message ?? c("saveFailed"))
		}
	}

	const textField = (key: string, definition: ContentDefinition, locale: string) => {
		const name = fieldName(locale, key)
		const label = text.label(key, definition.label)
		const description = text.help(key, definition.help)

		if (definition.type === "list") {
			return <ContentListField key={name} name={name} label={label} definition={definition} />
		}

		return definition.type === "textarea" ? (
			<ProTextarea key={name} name={name} label={label} description={description} rows={4} />
		) : (
			<ProInput key={name} name={name} label={label} description={description} />
		)
	}

	return (
		<ProForm onSubmit={onSubmit} defaultValues={defaults} className="space-y-5">
			{sections.map((section) => {
				const inSection = entries.filter(([, d]) => d.section === section)
				const images = inSection.filter(([, d]) => d.type === "image")
				const texts = inSection.filter(([, d]) => d.type !== "image")

				/*
				 * Where this section is on the site.
				 *
				 * It is what lets the labels beneath stay short: "Tile 2 text" means
				 * nothing on its own and everything under "the four picture tiles
				 * directly under the slider, left to right". Without it an editor has
				 * to open the page in another tab and count.
				 */
				const where = text.sectionWhere(group, section, data.sections[`${group}/${section}`])

				return (
					<section key={section} className="bg-card space-y-4 rounded-lg border p-5">
						<div>
							<h3 className="font-heading text-sm font-semibold">{text.section(section)}</h3>
							{where && <p className="text-muted-foreground mt-0.5 text-xs">{where}</p>}
						</div>

						{/*
						 * Pictures sit above the words and outside the language tabs,
						 * because there is one of them for both languages — the shop
						 * changes a photograph once, not once per translation. Putting
						 * them inside a tab would imply otherwise.
						 */}
						{!!images.length && (
							<div className="grid gap-4 sm:grid-cols-2">
								{images.map(([key, definition]) => (
									<CategoryAssetField
										key={key}
										name={fieldName("img", key)}
										previewName={fieldName("imgPreview", key)}
										label={text.label(key, definition.label)}
										description={text.help(key, definition.help) ?? t("sharedByBothLanguages")}
										pickerTitle={text.label(key, definition.label)}
									/>
								))}
							</div>
						)}

						{!!texts.length && (
							<Tabs value={activeLocale} onValueChange={setActiveLocale}>
								<TabsList>
									{locales.map((locale) => {
										const count = behind(locale)
										return (
											<TabsTrigger key={locale} value={locale} className="gap-2 uppercase">
												{locale}
												{count > 0 && (
													<Badge variant="secondary" className="text-[10px]">
														{count}
													</Badge>
												)}
											</TabsTrigger>
										)
									})}
								</TabsList>

								{locales.map((locale) => (
									<TabsContent key={locale} value={locale} className="space-y-4 pt-4">
										{texts.map(([key, definition]) => textField(key, definition, locale))}
									</TabsContent>
								))}
							</Tabs>
						)}

						{/* Whatever this section owns that is not a string. Below the
						    words, because the words are the heading it sits under. */}
						{sectionExtras?.[section]}
					</section>
				)
			})}

			<ProSubmit>{c("save")}</ProSubmit>
		</ProForm>
	)
}

export default ContentGroupForm
