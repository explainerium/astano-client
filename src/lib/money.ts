/**
 * Currency formatting.
 *
 * Formatting only — never arithmetic. Every amount shown in the storefront
 * arrives from the API already resolved for the caller's role and quantity,
 * and the moment this file starts multiplying things is the moment six
 * surfaces stop agreeing on a price (spec risk #1).
 *
 * The prices come off the wire as decimal strings, not numbers, because that
 * is how they survive the trip from Postgres without a float rounding it.
 */
export const formatMoney = (value: string | number | null | undefined, locale = "de") => {
	if (value === null || value === undefined || value === "") return null
	const amount = typeof value === "number" ? value : Number(value)
	if (!Number.isFinite(amount)) return null

	return new Intl.NumberFormat(locale === "de" ? "de-DE" : "en-GB", {
		style: "currency",
		currency: "EUR",
	}).format(amount)
}
