"use client"

import { useLocale, useTranslations } from "next-intl"
import ProInput from "@/components/form/ProInput"
import ProSelect from "@/components/form/ProSelect"
import { SHIPPING_COUNTRIES } from "@/lib/countries"
import { canSellTo, readSellingRule } from "@/lib/sellingLocations"
import { canShipTo, readShippingRule } from "@/lib/shippingLocations"
import { usePublicSettingsQuery } from "@/redux/api/settingApi"

/**
 * One address block, used for both billing and delivery.
 *
 * `prefix` makes the field names nested paths ("billing.city"), which is what
 * react-hook-form does with dots — here that is exactly what we want, since
 * the API takes a nested address object.
 *
 * The country is a select of ISO codes, never free text. The old shop replaced
 * its country select with a text field holding labels like "Deutschland", and
 * both tax and shipping resolution broke on it.
 */
export const AddressFields = ({ prefix }: { prefix: "billing" | "shipping" }) => {
	const t = useTranslations("checkout")
	const locale = useLocale()

	/**
	 * Narrowed to where the shop actually sells — and, for the delivery address,
	 * to where it actually ships.
	 *
	 * The same rules the API enforces at placement, applied here so a customer is
	 * never offered a country their order would then be refused for. Filtered
	 * rather than disabled: an option that cannot be chosen is just noise.
	 *
	 * The two lists differ on purpose. A shop can invoice a customer in a country
	 * it will not deliver to — the billing address is where the money comes from,
	 * not where the pallet goes.
	 */
	const { data: shopSettings } = usePublicSettingsQuery()
	const settings = shopSettings ?? {}
	const selling = readSellingRule(settings)
	const shipping = readShippingRule(settings)

	const allowed = (code: string) =>
		prefix === "shipping" ? canShipTo(shipping, selling, code) : canSellTo(selling, code)

	const countries = SHIPPING_COUNTRIES.filter((country) => allowed(country.code)).map(
		(country) => ({
			value: country.code,
			label: locale === "de" ? country.de : country.en,
		})
	)

	return (
		<div className="grid gap-5 sm:grid-cols-2">
			<ProInput name={`${prefix}.firstName`} label={t("firstName")} autoComplete="given-name" required />
			<ProInput name={`${prefix}.lastName`} label={t("lastName")} autoComplete="family-name" required />

			<div className="sm:col-span-2">
				<ProInput
					name={`${prefix}.company`}
					label={t("company")}
					autoComplete="organization"
					required={prefix === "billing"}
				/>
			</div>

			<div className="sm:col-span-2">
				<ProInput
					name={`${prefix}.street1`}
					label={t("street1")}
					autoComplete="address-line1"
					required
				/>
			</div>
			<div className="sm:col-span-2">
				<ProInput name={`${prefix}.street2`} label={t("street2")} autoComplete="address-line2" />
			</div>

			<ProInput name={`${prefix}.postcode`} label={t("postcode")} autoComplete="postal-code" required />
			<ProInput name={`${prefix}.city`} label={t("city")} autoComplete="address-level2" required />

			<ProSelect
				name={`${prefix}.countryCode`}
				label={t("country")}
				options={countries}
				required
			/>
			<ProInput name={`${prefix}.state`} label={t("state")} autoComplete="address-level1" />

			<ProInput
				name={`${prefix}.phone`}
				type="tel"
				label={t("phone")}
				autoComplete="tel"
				required={prefix === "billing"}
			/>
			<ProInput
				name={`${prefix}.email`}
				type="email"
				label={t("email")}
				autoComplete="email"
				required={prefix === "billing"}
			/>
		</div>
	)
}

export default AddressFields
