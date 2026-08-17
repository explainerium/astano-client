/**
 * Country names, and the countries the shop will actually deliver to.
 *
 * Both used to be answered by a list of seventeen hardcoded here, with a
 * comment admitting the duplication and predicting the failure: the shipping
 * zones were an admin-only endpoint, so the storefront had nothing else to read
 * from and the two drifted apart. They did, in both directions — the list
 * offered Latvia and Lithuania, which had no zone and therefore no delivery
 * method, while Czechia, Estonia, Finland, Monaco and the Netherlands were
 * configured and could not be chosen at all.
 *
 * `GET /shipping/countries` is that missing endpoint. The zones are the single
 * source of truth now, and this file only turns their codes into something a
 * person can read.
 */

/**
 * The country's name in the reader's language.
 *
 * `Intl.DisplayNames` rather than a table: it covers every code for free and
 * cannot fall out of step with the zones. The old table returned the raw code
 * for anything outside its seventeen, so an address in the Netherlands printed
 * as "NL" on the order page.
 */
export const countryName = (code: string, locale: string): string => {
	if (!code) return ""

	try {
		return new Intl.DisplayNames([locale], { type: "region" }).of(code.toUpperCase()) ?? code
	} catch {
		// An invalid code reaches Intl as a throw rather than a miss. Showing the
		// code is the honest fallback — it is what the record holds.
		return code
	}
}

export interface CountryOption {
	label: string
	value: string
	/** Searchable but not displayed — see `sortedCountryOptions`. */
	keywords?: string[]
}

/** Offered first — this is a German shop and most customers are in DE or nearby. */
const PRIORITY = ["DE", "AT", "CH"]

/**
 * Codes as options, named in `locale` and sorted by that language's collation —
 * "Österreich" belongs next to "Oman" in German, not at the end of the list.
 *
 * On a non-English page each entry also carries its English name as a hidden
 * search term, so a bilingual customer typing "Netherlands" still finds
 * "Niederlande". Plenty of people shop in German but think in English.
 */
export const sortedCountryOptions = (codes: readonly string[], locale: string): CountryOption[] => {
	const english = new Intl.DisplayNames(["en"], { type: "region" })

	const build = (code: string): CountryOption => {
		const label = countryName(code, locale)
		const englishName = english.of(code) ?? code

		return {
			value: code,
			label,
			...(englishName !== label ? { keywords: [englishName] } : {}),
		}
	}

	const priority = PRIORITY.filter((code) => codes.includes(code))

	const rest = codes
		.filter((code) => !priority.includes(code))
		.map(build)
		.sort((a, b) => a.label.localeCompare(b.label, locale))

	return [...priority.map(build), ...rest]
}
