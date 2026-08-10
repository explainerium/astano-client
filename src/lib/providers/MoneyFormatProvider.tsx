"use client"

import useMoneyFormat from "@/lib/useMoneyFormat"

/**
 * Teaches the money formatter the shop's settings, once per app.
 *
 * Renders nothing, and — importantly — does not make prices reactive on its
 * own. It used to be the only thing calling `configureMoney`, sitting beside
 * the children rather than around them, which meant a saved separator changed
 * a module value that nothing re-read: the admin saved, the value was stored,
 * and every price on screen carried on showing the old one.
 *
 * The components that draw prices call `useMoneyFormat` themselves for that
 * reason. This is here so the format is also correct for the few callers that
 * are not components, and so the settings are fetched even on a page with no
 * prices on it.
 */
export const MoneyFormatProvider = () => {
	useMoneyFormat()
	return null
}

export default MoneyFormatProvider
