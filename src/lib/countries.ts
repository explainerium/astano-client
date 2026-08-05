/**
 * The countries offered in the checkout country select.
 *
 * This list mirrors the delivery countries stated on Zahlung & Versand and
 * configured as shipping zones in the admin. It is duplicated here because the
 * shipping zones are an admin-only endpoint — there is no public "where do you
 * deliver" route — so the select has nothing else to read from.
 *
 * The list is only an input hint. Whether an order can actually be delivered
 * is decided by the checkout preview, which returns no shipping options for a
 * destination that is not covered. If the zones change, this needs changing
 * too; a small public endpoint would remove the duplication for good.
 */
export interface Country {
	code: string
	en: string
	de: string
}

export const SHIPPING_COUNTRIES: Country[] = [
	{ code: "DE", en: "Germany", de: "Deutschland" },
	{ code: "AT", en: "Austria", de: "Österreich" },
	{ code: "BE", en: "Belgium", de: "Belgien" },
	{ code: "HR", en: "Croatia", de: "Kroatien" },
	{ code: "DK", en: "Denmark", de: "Dänemark" },
	{ code: "FR", en: "France", de: "Frankreich" },
	{ code: "HU", en: "Hungary", de: "Ungarn" },
	{ code: "IT", en: "Italy", de: "Italien" },
	{ code: "LV", en: "Latvia", de: "Lettland" },
	{ code: "LT", en: "Lithuania", de: "Litauen" },
	{ code: "LU", en: "Luxembourg", de: "Luxemburg" },
	{ code: "PL", en: "Poland", de: "Polen" },
	{ code: "SK", en: "Slovakia", de: "Slowakei" },
	{ code: "SI", en: "Slovenia", de: "Slowenien" },
	{ code: "ES", en: "Spain", de: "Spanien" },
	{ code: "SE", en: "Sweden", de: "Schweden" },
	{ code: "CH", en: "Switzerland", de: "Schweiz" },
]

export const countryName = (code: string, locale: string) => {
	const country = SHIPPING_COUNTRIES.find((c) => c.code === code)
	if (!country) return code
	return locale === "de" ? country.de : country.en
}
