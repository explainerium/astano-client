"use client"

import { usePublicSettingsQuery } from "@/redux/api/settingApi"
import { configureMoney, readMoneyFormat, type MoneyFormat } from "./money"

/**
 * Subscribes a component to the shop's currency format.
 *
 * Call it in anything that renders a price, even if the return value is not
 * used. That is the whole point: `formatMoney` reads module state, and module
 * state re-renders nothing — a component that has already drawn "1.234,50 €"
 * keeps that string forever, whatever the admin saves afterwards.
 *
 * This hook fixes that by making the settings query the dependency. When the
 * settings arrive, or an admin changes a separator and the save invalidates the
 * cache, every component holding this hook re-renders and every price is
 * written again.
 *
 * It also keeps the module in step, so the handful of callers that are not
 * components still format correctly.
 *
 * RTK Query deduplicates the query, so twenty components holding this make one
 * request between them.
 */
export const useMoneyFormat = (): MoneyFormat => {
	const { data } = usePublicSettingsQuery()

	const next = readMoneyFormat(data)

	// During render rather than in an effect. An effect runs after paint, so
	// every price would be drawn once in the default format and then again in
	// the shop's. Assigning module state is not React state, so this is safe
	// here and idempotent besides.
	configureMoney(next)

	return next
}

export default useMoneyFormat
