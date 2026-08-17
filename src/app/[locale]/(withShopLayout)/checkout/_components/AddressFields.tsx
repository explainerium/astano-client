"use client"

import { useTranslations } from "next-intl"
import ProInput from "@/components/form/ProInput"
import ProSelect from "@/components/form/ProSelect"
import useDeliveryCountries, { useSellingCountries } from "@/lib/useDeliveryCountries"

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

	/**
	 * Where the shop sells, and — for the delivery address — where it ships.
	 *
	 * The two lists differ on purpose. A shop can invoice a customer in a country
	 * it will not deliver to: the billing address is where the money comes from,
	 * not where the pallet goes.
	 *
	 * Both used to be filtered out of seventeen countries hardcoded in the
	 * frontend, which was the wrong universe for either question. It offered two
	 * the shop had no delivery method for, hid five it did, and left a customer
	 * billing from anywhere else unable to enter their own address. Delivery now
	 * comes from the shipping zones themselves and billing from every country
	 * there is, minus whatever the admin's selling rule excludes.
	 */
	const delivery = useDeliveryCountries()
	const selling = useSellingCountries()

	const countries = prefix === "shipping" ? delivery.options : selling.options

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
