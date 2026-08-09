"use client"

import { usePublicSettingsQuery } from "@/redux/api/settingApi"
import { configureMoney } from "@/lib/money"

/**
 * Applies the shop's currency settings to the money formatter.
 *
 * Renders nothing. It exists because `formatMoney` is a plain function called
 * from sixty-odd places — some of them not components — and the alternative was
 * threading a hook through every one of them to change a decimal separator.
 *
 * Configured during render rather than in an effect: an effect would run after
 * the first paint, so every price on the page would render once in the default
 * format and then again in the shop's. Assigning to a module-level value is not
 * React state, so this is safe to do in render and idempotent besides.
 */
export const MoneyFormatProvider = () => {
	const { data } = usePublicSettingsQuery()

	if (data) {
		configureMoney({
			currency: String(data["currency.code"] ?? "EUR"),
			locale: String(data["currency.locale"] ?? "de-DE"),
			decimals: Number(data["currency.decimals"] ?? 2),
		})
	}

	return null
}

export default MoneyFormatProvider
