import { cookies } from "next/headers"
import { locales, routing, type Locale } from "@/i18n/routing"
import en from "../../messages/en.json"
import de from "../../messages/de.json"

/**
 * The dashboard's own language.
 *
 * Deliberately separate from the storefront's. The dashboard has no locale
 * segment — it is staff tooling, not a public site, and giving it translated
 * URLs would mean /de/admin/produkte for an audience of four people. So the
 * choice lives in a cookie instead of the path.
 *
 * It is also separate from the *shop's* language setting. A German shop can
 * have an English-speaking supplier managing the catalogue, and the visitor's
 * language is not that person's. WordPress splits these the same way: Site
 * Language for the front, a per-user language for the back.
 */

export const ADMIN_LOCALE_COOKIE = "astano_admin_locale"

const CATALOGUES: Record<Locale, unknown> = { en, de }

type Messages = Record<string, unknown>

const isObject = (value: unknown): value is Messages =>
	typeof value === "object" && value !== null && !Array.isArray(value)

/**
 * German over English, key by key.
 *
 * This is what makes translating the dashboard safe to do in pieces. The
 * catalogue is ~500 strings across 92 files and will not be finished in one
 * sitting; without a fallback, every key not yet translated would render as its
 * own dotted path — "admin.orders.title" printed on the page — and the
 * dashboard would be *more* broken after each partial pass, not less.
 *
 * With it, an untranslated key quietly shows the English it showed before.
 */
const merge = (base: Messages, override: Messages): Messages => {
	const out: Messages = { ...base }

	for (const [key, value] of Object.entries(override)) {
		const existing = out[key]
		out[key] = isObject(existing) && isObject(value) ? merge(existing, value) : value
	}

	return out
}

export const isAdminLocale = (value: unknown): value is Locale =>
	typeof value === "string" && (locales as readonly string[]).includes(value)

/** What the staff member last chose, or the compiled default. */
export const readAdminLocale = async (): Promise<Locale> => {
	const stored = (await cookies()).get(ADMIN_LOCALE_COOKIE)?.value

	return isAdminLocale(stored) ? stored : routing.defaultLocale
}

export const adminMessages = (locale: Locale): Messages => {
	const base = CATALOGUES.en as Messages

	if (locale === "en") return base

	return merge(base, CATALOGUES[locale] as Messages)
}
