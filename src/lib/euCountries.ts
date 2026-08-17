/**
 * When a business must supply a VAT ID.
 *
 * Mirrors backend/src/domain/tax/euCountries.ts exactly. Duplicated on purpose
 * rather than fetched, the same way the selling rule is: the form has to decide
 * whether the field is required as the customer types, and the two copies must
 * agree or somebody is refused by the server for a field the form called
 * optional. The backend one is the authority; this one is the courtesy.
 *
 * The rule is narrower than "businesses have VAT IDs":
 *
 *  • **Germany → Germany.** Taxed normally at 19%. The buyer's VAT ID changes
 *    nothing, so requiring it would refuse German dealers over a field that
 *    does not apply to them.
 *  • **Germany → another EU country.** Reverse charge, which is only lawful
 *    against a valid VAT ID — so here it is genuinely required.
 *  • **Germany → outside the EU.** An export. There is no EU VAT ID to give.
 */

/** ISO 3166-1 alpha-2, the 27 member states as of 2026. */
export const EU_COUNTRIES: readonly string[] = [
	"AT", "BE", "BG", "CY", "CZ", "DE", "DK", "EE", "ES", "FI", "FR", "GR",
	"HR", "HU", "IE", "IT", "LT", "LU", "LV", "MT", "NL", "PL", "PT", "RO",
	"SE", "SI", "SK",
]

export const isEuCountry = (countryCode: string | null | undefined): boolean =>
	Boolean(countryCode) && EU_COUNTRIES.includes(countryCode!.toUpperCase())

/** Whether a business in `countryCode` must supply a VAT ID to this shop. */
export const requiresVatId = (
	countryCode: string | null | undefined,
	shopCountry: string | null | undefined = "DE"
): boolean => {
	if (!countryCode) return false

	const country = countryCode.toUpperCase()
	const shop = (shopCountry || "DE").toUpperCase()

	return isEuCountry(country) && country !== shop
}
