/**
 * Whether the shop will take an order going to a given country.
 *
 * Mirrors backend/src/domain/shop/sellingLocations.ts exactly. Duplicated on
 * purpose rather than fetched: the checkout has to filter its country field
 * before it can ask anything, and the two copies must agree or a customer is
 * offered a country the API then refuses. Keep them in step — the backend one
 * is the authority, this one is the courtesy.
 */

export type SellingMode = "all" | "all_except" | "specific"

export interface SellingRule {
	mode: SellingMode
	/** ISO 3166-1 alpha-2. Meaningless when the mode is `all`. */
	countries: string[]
}

export const canSellTo = (rule: SellingRule, countryCode: string | null | undefined): boolean => {
	if (rule.mode === "all") return true
	if (!countryCode) return true

	const country = countryCode.toUpperCase()
	const listed = rule.countries.map((code) => code.toUpperCase()).includes(country)

	return rule.mode === "specific" ? listed : !listed
}

/**
 * Reads the rule out of the public settings, tolerating whatever is there.
 *
 * Falls back to selling everywhere. The failure modes are not symmetrical: a
 * bad value that quietly refuses every country empties the checkout's country
 * field and nobody can see why, while one that offers too many is caught by the
 * server on placement.
 */
export const readSellingRule = (settings: Record<string, unknown>): SellingRule => {
	const mode = settings["selling.locations"]
	const countries = settings["selling.countries"]

	return {
		mode: mode === "all_except" || mode === "specific" ? mode : "all",
		countries: Array.isArray(countries)
			? countries.filter((code): code is string => typeof code === "string")
			: [],
	}
}

/**
 * Which country the checkout should start on.
 *
 * Three answers, matching the setting: the shop's own country, one the admin
 * named, or none at all — an empty string, which leaves the field for the
 * customer to fill rather than guessing on their behalf.
 */
export const preselectedCountry = (settings: Record<string, unknown>): string => {
	const mode = settings["selling.customerDefault"]

	if (mode === "none") return ""

	if (mode === "specific") return String(settings["selling.defaultCountry"] ?? "")

	// The shop's own country, which is also the fallback: it is the right guess
	// far more often than not for a German shop selling mostly into Germany.
	return String(settings["company.countryCode"] ?? settings["selling.defaultCountry"] ?? "DE")
}
