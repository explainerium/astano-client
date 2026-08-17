"use client"

import { useLocale } from "next-intl"
import { useMemo } from "react"
import { ISO_COUNTRY_CODES } from "@/constants/countries"
import { usePublicSettingsQuery, useDeliveryCountriesQuery } from "@/redux/api/settingApi"
import { canSellTo, readSellingRule } from "./sellingLocations"
import { sortedCountryOptions, type CountryOption } from "./countries"

/**
 * The countries a customer may choose, ready for a select.
 *
 * One hook so every dropdown asks the same question of the same endpoint.
 * Three of them used to read a list hardcoded in the frontend, which drifted
 * from the admin's shipping zones in both directions — and the drift was
 * invisible until somebody picked Latvia and found the checkout had no delivery
 * method for it.
 *
 * The selling rule is applied on the server, so nothing here has to filter
 * again: what comes back is already what the shop will take an order for.
 */
export const useDeliveryCountries = (): {
	options: CountryOption[]
	codes: string[]
	isLoading: boolean
} => {
	const locale = useLocale()
	const { data, isLoading } = useDeliveryCountriesQuery()

	const codes = useMemo(() => data?.countries ?? [], [data])
	const options = useMemo(() => sortedCountryOptions(codes, locale), [codes, locale])

	return { options, codes, isLoading }
}

/**
 * The countries the shop will take an order *from*, which is a wider question.
 *
 * A shop can invoice a customer in a country it will not deliver to — the
 * billing address is where the money comes from, not where the pallet goes. So
 * this starts from every country there is and removes only what the admin's
 * selling rule excludes, rather than starting from the delivery list.
 *
 * That distinction already existed in the checkout and was being applied to the
 * wrong universe: the filter ran over seventeen hardcoded countries, so a
 * customer with a billing address anywhere else simply could not enter it.
 */
export const useSellingCountries = (): { options: CountryOption[] } => {
	const locale = useLocale()
	const { data: settings } = usePublicSettingsQuery()

	const options = useMemo(() => {
		const rule = readSellingRule(settings ?? {})
		const codes = ISO_COUNTRY_CODES.filter((code) => canSellTo(rule, code))

		return sortedCountryOptions(codes, locale)
	}, [settings, locale])

	return { options }
}

export default useDeliveryCountries
