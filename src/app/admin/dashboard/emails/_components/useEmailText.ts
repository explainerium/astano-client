"use client"

import { useTranslations } from "next-intl"

/**
 * German for the email registry, without changing the API.
 *
 * The label and description of each email are declared in the backend's
 * emailRegistry and arrive as finished English. The German lives here with
 * every other translation, keyed by the email's own kind, and the English the
 * API sent is the fallback — so an email added to the registry tomorrow shows
 * its English immediately and can be translated later without a deploy.
 *
 * The same arrangement the settings screens use; see useSettingText.
 */
export const useEmailText = () => {
	const t = useTranslations("adminEmails")

	/**
	 * `t.has` rather than a try/catch: next-intl treats a missing key as an
	 * error, and an untranslated email is not one.
	 */
	const read = (path: string, fallback: string): string => (t.has(path) ? t(path) : fallback)

	return {
		label: (kind: string, fallback: string) => read(`${kind}.label`, fallback),
		description: (kind: string, fallback: string) => read(`${kind}.description`, fallback),
	}
}

export default useEmailText
