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
	 * Setting keys are dotted; next-intl reads a dot as a path separator.
	 *
	 * So `keys.currency.code.label` was looked up as keys → currency → code →
	 * label, four levels deep, while the catalogue holds "currency.code" as one
	 * key. It never matched, and every settings screen quietly fell back to the
	 * English the API sent — which is exactly what it looks like when nothing
	 * has been translated at all.
	 *
	 * The same escape SettingsGroupForm already uses for react-hook-form.
	 */
	const escape = (key: string) => key.split(".").join("__")

	/**
	 * `t.has` rather than a try/catch: next-intl treats a missing key as an
	 * error, and this is not one — an untranslated setting is the expected
	 * state while the catalogue is being filled in.
	 */
	const read = (path: string, fallback: string | undefined): string | undefined =>
		t.has(path) ? t(path) : fallback

	return {
		label: (key: string, fallback: string) => read(`keys.${escape(key)}.label`, fallback) ?? fallback,
		help: (key: string, fallback?: string) => read(`keys.${escape(key)}.help`, fallback),
		/**
		 * One choice inside a select.
		 *
		 * These are declared in the registry alongside the setting, so they
		 * arrived in English exactly as the labels did — and a German "Währung"
		 * with "Left — €1.234,56" underneath it is the half-translated screen
		 * this whole arrangement exists to avoid.
		 *
		 * Some are deliberately left untranslated by having no key: the language
		 * names read in their own language, and "2 / 3 / 4" is a number.
		 */
		option: (key: string, value: string, fallback: string) =>
			read(`options.${escape(key)}.${value}`, fallback) ?? fallback,
		groupTitle: (key: string, fallback: string) =>
			read(`groups.${key}.title`, fallback) ?? fallback,
		groupBlurb: (key: string, fallback?: string) => read(`groups.${key}.blurb`, fallback),
		sectionTitle: (key: string, fallback: string) =>
			read(`sections.${key}`, fallback) ?? fallback,
	}
}

export default useSettingText
