"use client"

import { useTranslations } from "next-intl"

/**
 * German for the settings screens, without changing the API.
 *
 * The labels, help text, group titles and blurbs are declared in the backend's
 * settingRegistry and arrive as finished English strings — 130 of them. The
 * obvious fix was to make the registry bilingual and have the API answer in the
 * request's language, but that splits the shop's translations across two repos
 * and means a wording change needs a backend deploy.
 *
 * So the German lives here with every other translation, keyed by the setting's
 * own key, and the English the API sent is the fallback. A setting added to the
 * registry tomorrow shows its English immediately and can be translated later
 * without touching the server.
 */
export const useSettingText = () => {
	const t = useTranslations("adminSettings")

	/**
	 * `t.has` rather than a try/catch: next-intl treats a missing key as an
	 * error, and this is not one — an untranslated setting is the expected
	 * state while the catalogue is being filled in.
	 */
	const read = (path: string, fallback: string | undefined): string | undefined =>
		t.has(path) ? t(path) : fallback

	return {
		label: (key: string, fallback: string) => read(`keys.${key}.label`, fallback) ?? fallback,
		help: (key: string, fallback?: string) => read(`keys.${key}.help`, fallback),
		groupTitle: (key: string, fallback: string) =>
			read(`groups.${key}.title`, fallback) ?? fallback,
		groupBlurb: (key: string, fallback?: string) => read(`groups.${key}.blurb`, fallback),
		sectionTitle: (key: string, fallback: string) =>
			read(`sections.${key}`, fallback) ?? fallback,
	}
}

export default useSettingText
