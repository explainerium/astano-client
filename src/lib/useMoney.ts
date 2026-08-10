"use client"

import { usePublicSettingsQuery } from "@/redux/api/settingApi"
import { configureMoney, formatWith, readMoneyFormat } from "./money"
import { readLastKnownSettings, rememberSettings } from "./lastKnownSettings"

/**
 * The shop's price formatter, as a value.
 *
 * Use this in anything that renders a price. `formatMoney` still works and
 * still reads the same settings, but it reads them from module state — and
 * React Compiler cannot see module state. It memoises a rendered price against
 * the props and data it *can* see, so a component whose order total has not
 * changed keeps the string it computed even after the admin changes the decimal
 * separator. Subscribing to the settings query is not enough on its own: the
 * component re-renders and the compiler hands back the cached JSX.
 *
 * Returning a function fixes that. Its identity changes with every render of
 * the subscribing component, so the compiler treats every price derived from it
 * as fresh — which is exactly the dependency that was invisible before.
 *
 * The cost is re-running some string formatting. That is nothing next to
 * getting the shop's own prices wrong.
 */
export const useMoney = () => {
	const { data } = usePublicSettingsQuery()

	/*
	 * The last known settings cover the wait.
	 *
	 * Without them the first paint after a cold API — up to a minute on the free
	 * tier — writes every price in the built-in defaults, which on a shop whose
	 * separators differ looks exactly like the settings having stopped working.
	 * It is a deployed-only failure: a local API answers before anything renders.
	 */
	if (data) rememberSettings(data)

	const format = readMoneyFormat(data ?? readLastKnownSettings() ?? undefined)

	// Keeps the module version in step for callers that are not components.
	configureMoney(format)

	return (value: string | number | null | undefined) => formatWith(format, value)
}

export default useMoney
