/**
 * Date formatting for the storefront.
 *
 * Locale-aware, unlike the admin's hardcoded `en-GB` — a German customer
 * reading "5 Aug 2026" on an invoice page has been handed someone else's
 * conventions.
 */
export const formatDate = (value: string | Date | null | undefined, locale = "de") => {
	if (!value) return null
	const date = value instanceof Date ? value : new Date(value)
	if (Number.isNaN(date.getTime())) return null

	return date.toLocaleDateString(locale === "de" ? "de-DE" : "en-GB", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	})
}

export const formatDateTime = (value: string | Date | null | undefined, locale = "de") => {
	if (!value) return null
	const date = value instanceof Date ? value : new Date(value)
	if (Number.isNaN(date.getTime())) return null

	return date.toLocaleString(locale === "de" ? "de-DE" : "en-GB", {
		day: "2-digit",
		month: "short",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	})
}
