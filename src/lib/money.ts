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
 *
 * The layout is composed here rather than handed to `Intl` with a locale. It
 * used to be the other way round, and a locale is genuinely the tidier idea —
 * one choice that cannot produce a contradiction. But the shop's settings now
 * name the separators and the symbol position directly, the way WooCommerce
 * does, and a price written by `Intl` would ignore them. Intl is still asked
 * for the currency *symbol*, which is the part it knows and we should not
 * keep a table of.
 */

export type SymbolPosition = "left" | "right" | "left_space" | "right_space"

export interface MoneyFormat {
	currency: string
	position: SymbolPosition
	thousandSeparator: string
	decimalSeparator: string
	decimals: number
}

/**
 * Sensible German defaults, replaced once the shop's own settings arrive.
 *
 * Defaults rather than nothing: the first paint happens before any request
 * completes, and a price rendered as `NaN` for a moment is worse than one
 * rendered in the wrong separator for a moment.
 */
let format: MoneyFormat = {
	currency: "EUR",
	position: "right_space",
	thousandSeparator: ".",
	decimalSeparator: ",",
	decimals: 2,
}

/**
 * Applies the shop's currency settings.
 *
 * Module-level rather than context, because `formatMoney` is called from 60-odd
 * places including a few that are not components. Threading a hook through all
 * of them to change a separator would be a large edit for a small setting.
 *
 * Module state on its own is not enough, though, and this is worth spelling out
 * because it was wrong for a while: changing a value here re-renders nothing.
 * A component that has already drawn a price keeps the string it computed. So
 * every component that formats money calls `useMoneyFormat`, which subscribes
 * it to the settings query — that is what makes a saved separator appear.
 */
export const configureMoney = (next: Partial<MoneyFormat>): void => {
	format = { ...format, ...next }
	symbolCache.clear()
}

export const moneyFormat = (): MoneyFormat => format

/** Reads the shop's format out of the public settings block. */
export const readMoneyFormat = (settings: Record<string, unknown> | undefined): MoneyFormat => {
	if (!settings) return format

	const position = String(settings["currency.position"] ?? "")

	return {
		currency: String(settings["currency.code"] ?? "EUR"),
		position: POSITIONS.includes(position as SymbolPosition)
			? (position as SymbolPosition)
			: "right_space",
		// A separator may legitimately be empty — "1234,56" is a real choice — so
		// these fall back only when the setting is absent, never when it is blank.
		thousandSeparator: String(settings["currency.thousandSeparator"] ?? "."),
		decimalSeparator: String(settings["currency.decimalSeparator"] ?? ","),
		decimals: Number(settings["currency.decimals"] ?? 2),
	}
}

const POSITIONS: SymbolPosition[] = ["left", "right", "left_space", "right_space"]

/** Symbol lookup is the one thing Intl is still asked for, so it is cached. */
const symbolCache = new Map<string, string>()

const symbolOf = (currency: string): string => {
	const cached = symbolCache.get(currency)
	if (cached !== undefined) return cached

	let symbol = currency

	try {
		const parts = new Intl.NumberFormat("en", {
			style: "currency",
			currency,
			currencyDisplay: "narrowSymbol",
		}).formatToParts(0)

		symbol = parts.find((p) => p.type === "currency")?.value ?? currency
	} catch {
		// An unknown or malformed code. The code itself is a fair label — better
		// than throwing on every price in the shop.
	}

	symbolCache.set(currency, symbol)
	return symbol
}

/** Groups the integer part in threes with whatever the shop uses. */
const group = (digits: string, separator: string): string =>
	separator ? digits.replace(/\B(?=(\d{3})+(?!\d))/g, separator) : digits

/**
 * The module-state version, for the few callers that are not components.
 *
 * Components must use `useMoney` instead. This one reads a module value, which
 * React Compiler cannot see — it memoises a rendered price against the data it
 * can see and reuses the string when only the shop's separators changed. That
 * is not a bug in the compiler; it is what hidden mutable state costs.
 */
export const formatMoney = (value: string | number | null | undefined) =>
	formatWith(format, value)

/**
 * What `useMoney` hands back.
 *
 * Named so a helper outside a component can take the formatter as an argument
 * rather than importing the module-state one and quietly falling out of step.
 */
export type MoneyFormatter = (value: string | number | null | undefined) => string | null

/** Pure. The format arrives as a value, so a caller's dependency on it is visible. */
export const formatWith = (
	active: MoneyFormat,
	value: string | number | null | undefined
): string | null => {
	if (value === null || value === undefined || value === "") return null

	const amount = typeof value === "number" ? value : Number(value)
	if (!Number.isFinite(amount)) return null

	const { currency, position, thousandSeparator, decimalSeparator, decimals } = active

	// toFixed rounds half away from zero, which is what a price list does.
	const fixed = Math.abs(amount).toFixed(Math.max(0, Math.min(10, decimals)))
	const [whole = "0", fraction = ""] = fixed.split(".")

	const number =
		group(whole, thousandSeparator) + (fraction ? decimalSeparator + fraction : "")

	// The sign goes outside the symbol — "-€5", not "€-5".
	const sign = amount < 0 ? "-" : ""
	const symbol = symbolOf(currency)

	switch (position) {
		case "left":
			return `${sign}${symbol}${number}`
		case "left_space":
			return `${sign}${symbol} ${number}`
		case "right":
			return `${sign}${number}${symbol}`
		default:
			// A non-breaking space, so a price never wraps between the number and
			// its symbol at the end of a line.
			return `${sign}${number} ${symbol}`
	}
}
