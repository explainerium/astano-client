import { canSellTo, type SellingRule } from "./sellingLocations"

/**
 * Whether the shop delivers to a country.
 *
 * Mirrors backend/src/domain/shop/shippingLocations.ts exactly. Duplicated for
 * the same reason the selling rule is: the checkout has to filter its delivery
 * country field before it can ask the server anything, and the two copies must
 * agree or a customer picks a country the API then refuses.
 *
 * Shipping only ever narrows what selling allows — it can never add a country
 * the shop refuses to sell to.
 */

export type ShippingMode = "selling" | "all" | "specific" | "disabled"

export interface ShippingRule {
	mode: ShippingMode
	countries: string[]
}

export const readShippingRule = (settings: Record<string, unknown>): ShippingRule => {
	const mode = settings["shipping.locations"]
	const countries = settings["shipping.countries"]

	return {
		mode: mode === "all" || mode === "specific" || mode === "disabled" ? mode : "selling",
		countries: Array.isArray(countries)
			? countries.filter((code): code is string => typeof code === "string")
			: [],
	}
}

export const canShipTo = (
	rule: ShippingRule,
	selling: SellingRule,
	countryCode: string | null | undefined
): boolean => {
	if (rule.mode === "disabled") return false

	// Nothing to judge before an address exists — refusing here would empty the
	// field this is about to render.
	if (!countryCode) return true

	const country = countryCode.toUpperCase()

	if (!canSellTo(selling, country)) return false

	if (rule.mode === "specific") {
		return rule.countries.map((code) => code.toUpperCase()).includes(country)
	}

	return true
}

export const shippingDisabled = (rule: ShippingRule): boolean => rule.mode === "disabled"
