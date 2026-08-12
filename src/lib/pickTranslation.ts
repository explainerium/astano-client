import { routing } from "@/i18n/routing"

/**
 * Picks the row to show for a translated record in the dashboard.
 *
 * The dashboard has no locale segment — it is single-language by design — so
 * every table that lists a translated thing has to choose a row. Six of them
 * chose it by asking for `"en"` literally, which was correct only while English
 * happened to be the primary language. It no longer is, and the catalogue's
 * rows are being relabelled to German: those lookups would have started
 * returning nothing, printing bare attribute codes and dropping the "view on
 * site" links where the slug came from.
 *
 * Same order the API uses: the requested locale, then the default, then
 * whatever exists. The last step matters most here — a record part-way through
 * translation must still be identifiable in a list.
 */
export const pickTranslation = <T extends { locale: string }>(
	rows: T[] | undefined,
	locale: string = routing.defaultLocale
): T | undefined =>
	rows?.find((r) => r.locale === locale) ??
	rows?.find((r) => r.locale === routing.defaultLocale) ??
	rows?.[0]
