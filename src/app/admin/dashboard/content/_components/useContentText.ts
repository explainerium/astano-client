"use client"

import { useTranslations } from "next-intl"

/**
 * German for the content screen, without changing the API.
 *
 * Exactly the arrangement useSettingText.ts documents, and it is worth reading
 * that file rather than repeating its reasoning here. In short: the labels,
 * group titles and blurbs are declared in the backend's contentRegistry and
 * arrive as finished English — 231 of them. Making the registry bilingual would
 * split the shop's translations across two repos and put a wording change
 * behind a backend deploy, so the German lives here with every other
 * translation and the English the API sent is the fallback.
 *
 * A key added to the registry tomorrow therefore shows its English immediately
 * and can be translated later without touching the server.
 */
export const useContentText = () => {
	const t = useTranslations("adminContent")

	/**
	 * Content keys are dotted; next-intl reads a dot as a path separator.
	 *
	 * `keys.home.hero.slides.0.title.label` would be looked up seven levels
	 * deep, while the catalogue holds the whole thing as one key. The same
	 * escape the settings screen uses, for the same reason.
	 */
	const escape = (key: string) => key.split(".").join("__")

	/**
	 * `t.has` rather than try/catch: an untranslated key is the expected state
	 * while the catalogue is filled in, not an error.
	 */
	const read = (path: string, fallback: string | undefined): string | undefined =>
		t.has(path) ? t(path) : fallback

	return {
		label: (key: string, fallback: string) => read(`keys.${escape(key)}.label`, fallback) ?? fallback,
		help: (key: string, fallback?: string) => read(`keys.${escape(key)}.help`, fallback),
		groupTitle: (group: string, fallback: string) =>
			read(`groups.${group}.title`, fallback) ?? fallback,
		groupBlurb: (group: string, fallback?: string) => read(`groups.${group}.blurb`, fallback),
		/** Section headings repeat across groups ("Cards"), so they key on the name. */
		section: (name: string) => read(`sections.${escape(name)}`, name) ?? name,
		/**
		 * The line under a section heading saying where on the site it is.
		 *
		 * Keyed `group/section`, because a section name is only unique inside its
		 * group. The English the API sent is the fallback, as everywhere here.
		 */
		sectionWhere: (group: string, name: string, fallback?: string) =>
			read(`where.${escape(group)}__${escape(name)}`, fallback),
	}
}

export default useContentText
