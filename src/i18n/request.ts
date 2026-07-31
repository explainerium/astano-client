import { getRequestConfig } from "next-intl/server"
import { locales, routing, type Locale } from "./routing"

/**
 * Resolves the message catalogue for the current request. Called by the
 * next-intl plugin, which is wired up in next.config.ts.
 */
export default getRequestConfig(async ({ requestLocale }) => {
	const requested = await requestLocale

	const locale: Locale = locales.includes(requested as Locale)
		? (requested as Locale)
		: routing.defaultLocale

	return {
		locale,
		messages: (await import(`../../messages/${locale}.json`)).default,
	}
})
