import { getRequestConfig } from "next-intl/server"
import { mergeContent, readContentOverrides } from "@/lib/contentOverrides"
import { locales, routing, type Locale } from "./routing"

/**
 * Resolves the message catalogue for the current request. Called by the
 * next-intl plugin, which is wired up in next.config.ts.
 *
 * This is also where the shop's own edits are applied, and it is the only place
 * they are. Every `t()` call on the storefront — in 326 files — reads whatever
 * this function returns, so overriding here means the dashboard can change any
 * of the marketing copy without a single component knowing that it can.
 *
 * The shipped JSON is still the source: `mergeContent` writes over a *copy* of
 * it and skips any key the catalogue does not already have. If the overrides
 * are empty, or the API that serves them is asleep, the page renders exactly
 * what was built. See contentOverrides.ts for how that is kept true.
 */
export default getRequestConfig(async ({ requestLocale }) => {
	const requested = await requestLocale

	const locale: Locale = locales.includes(requested as Locale)
		? (requested as Locale)
		: routing.defaultLocale

	const messages = (await import(`../../messages/${locale}.json`)).default

	return {
		locale,
		messages: mergeContent(messages, await readContentOverrides(locale)),
	}
})
