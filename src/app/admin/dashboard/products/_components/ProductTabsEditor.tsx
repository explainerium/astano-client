"use client"

import { useTranslations } from "next-intl"
import { useFieldArray, useFormContext } from "react-hook-form"
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react"
import ProInput from "@/components/form/ProInput"
import ProRichText from "@/components/form/ProRichText"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

/**
 * The tabs the shop writes itself, shown on the product page after Description
 * and Additional information.
 *
 * The live shop has two tabs and no way to add a third, so anything that does
 * not fit either — care instructions, a size chart, delivery times — ends up
 * buried in the description.
 *
 * Order is a property of the tab, not of its translations, so German and
 * English cannot disagree about which comes first. The words are per language,
 * because they must be: a German page with an English tab heading reads worse
 * than one tab fewer, which is why the API drops a tab with no title in the
 * locale being served.
 */

/** Matches the editor locales the rest of this form uses. */
const LOCALES = [
	{ code: "en", label: "English" },
	{ code: "de", label: "Deutsch" },
] as const

export const ProductTabsEditor = () => {
	const t = useTranslations("admin")
	const { control } = useFormContext()

	const { fields, append, remove, move } = useFieldArray({ control, name: "tabs" })

	return (
		<div className="space-y-4">
			<p className="text-muted-foreground max-w-prose text-xs">{t("productTabsBlurb")}</p>

			{fields.map((field, index) => (
				<section key={field.id} className="rounded-lg border">
					<header className="flex flex-wrap items-center gap-2 border-b px-4 py-2.5">
						<span className="text-muted-foreground font-mono text-xs tabular-nums">
							{index + 1}
						</span>

						<span className="text-sm font-medium">{t("tab")}</span>

						<div className="ml-auto flex gap-1">
							<Button
								type="button"
								variant="ghost"
								size="icon"
								aria-label={t("moveUpNumbered", { index: index + 1 })}
								disabled={index === 0}
								onClick={() => move(index, index - 1)}
							>
								<ChevronUp />
							</Button>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								aria-label={t("moveDownNumbered", { index: index + 1 })}
								disabled={index === fields.length - 1}
								onClick={() => move(index, index + 1)}
							>
								<ChevronDown />
							</Button>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								aria-label={t("removeNumbered", { thing: t("tab"), index: index + 1 })}
								onClick={() => remove(index)}
							>
								<Trash2 />
							</Button>
						</div>
					</header>

					{/*
					 * One language at a time, the same shape as the product's own
					 * name and description above — so writing a tab feels like
					 * writing the rest of the product rather than a separate tool.
					 */}
					<Tabs defaultValue="en" className="gap-0">
						<div className="px-4 pt-3">
							<TabsList>
								{LOCALES.map((locale) => (
									<TabsTrigger key={locale.code} value={locale.code}>
										{locale.label}
									</TabsTrigger>
								))}
							</TabsList>
						</div>

						{LOCALES.map((locale, position) => (
							<TabsContent key={locale.code} value={locale.code} className="space-y-4 p-4">
								<ProInput
									name={`tabs.${index}.translations.${position}.title`}
									label={t("tabTitle")}
									description={t("tabTitleHelp")}
								/>
								<ProRichText
									name={`tabs.${index}.translations.${position}.content`}
									label={t("tabContent")}
									height="14rem"
								/>
							</TabsContent>
						))}
					</Tabs>
				</section>
			))}

			<Button
				type="button"
				variant="outline"
				onClick={() =>
					append({
						sortOrder: fields.length,
						// Both languages seeded, in the order LOCALES declares — the
						// fields above address them by position.
						translations: LOCALES.map((locale) => ({
							locale: locale.code,
							title: "",
							content: "",
						})),
					})
				}
			>
				<Plus />
				{t("addTab")}
			</Button>
		</div>
	)
}

export default ProductTabsEditor
