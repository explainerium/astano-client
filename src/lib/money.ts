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

export interface MoneyFormat {
	currency: string
	/** Intl locale — decides separators and where the symbol sits. */
	locale: string
	decimals: number
}

/**
 * Sensible German defaults, replaced once the shop's own settings arrive.
 *
 * Defaults rather than nothing: the first paint happens before any request
 * completes, and a price rendered as `NaN` for a moment is worse than one
 * rendered in the wrong separator for a moment.
 */
let format: MoneyFormat = { currency: "EUR", locale: "de-DE", decimals: 2 }

/** False until the shop's settings arrive, which is when the hint below stops mattering. */
let configured = false

/**
 * Applies the shop's currency settings. Called once, from MoneyFormatProvider.
 *
 * Module-level rather than context, because `formatMoney` is called from 60-odd
 * places including a few that are not components. Threading a hook through all
 * of them to change a separator would be a large edit for a small setting.
 */
export const configureMoney = (next: Partial<MoneyFormat>): void => {
	format = { ...format, ...next }
	configured = true
}

export const moneyFormat = (): MoneyFormat => format

/**
 * The shop's format wins over the visitor's language.
 *
 * A shop writes its prices one way — that is what the setting means, and what
 * WooCommerce does. The `locale` argument is a hint used only in the moment
 * before the settings land, so the very first paint on the English storefront
 * does not flicker from one convention to another.
 */
export const formatMoney = (value: string | number | null | undefined, locale?: string) => {
	if (value === null || value === undefined || value === "") return null
	const amount = typeof value === "number" ? value : Number(value)
	if (!Number.isFinite(amount)) return null

	const active = configured
		? format.locale
		: locale?.startsWith("en")
			? "en-GB"
			: format.locale

	return new Intl.NumberFormat(active, {
		style: "currency",
		currency: format.currency,
		minimumFractionDigits: format.decimals,
		maximumFractionDigits: format.decimals,
	}).format(amount)
}
