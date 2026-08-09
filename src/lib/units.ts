/**
 * Weight and dimension display.
 *
 * The database stores kilograms and centimetres — the columns are named
 * `weightKg`, `lengthCm` and so on, and shipping bands are matched against the
 * kilogram value. So the unit setting cannot reinterpret the stored number:
 * switching the shop to grams would turn a 0.5 kg pan into a 0.5 g one as far
 * as every shipping rate is concerned.
 *
 * It converts for display instead. The number in the database never changes,
 * shipping keeps working, and the customer reads the unit the shop chose.
 */

export type WeightUnit = "kg" | "g" | "lb"
export type DimensionUnit = "cm" | "mm" | "in"

/** Multiplier from the stored unit, and how many decimals that unit deserves. */
const WEIGHT: Record<WeightUnit, { factor: number; decimals: number }> = {
	kg: { factor: 1, decimals: 3 },
	g: { factor: 1000, decimals: 0 },
	lb: { factor: 2.2046226218, decimals: 2 },
}

const DIMENSION: Record<DimensionUnit, { factor: number; decimals: number }> = {
	cm: { factor: 1, decimals: 1 },
	mm: { factor: 10, decimals: 0 },
	in: { factor: 0.3937007874, decimals: 2 },
}

export const weightUnitOf = (settings: Record<string, unknown> | undefined): WeightUnit => {
	const value = settings?.["units.weight"]
	return value === "g" || value === "lb" ? value : "kg"
}

export const dimensionUnitOf = (settings: Record<string, unknown> | undefined): DimensionUnit => {
	const value = settings?.["units.dimension"]
	return value === "mm" || value === "in" ? value : "cm"
}

/**
 * Trailing zeros are dropped, so 2.500 kg reads "2.5 kg" and 2.000 reads "2".
 * A spec table full of padded zeros looks like a rounding artefact.
 */
const trim = (value: number, decimals: number): string =>
	String(Number(value.toFixed(decimals)))

/** `null` for an unset value — an empty dimension is not zero. */
export const formatWeight = (
	kg: string | number | null | undefined,
	unit: WeightUnit,
	locale?: string
): string | null => {
	if (kg === null || kg === undefined || kg === "") return null

	const base = Number(kg)
	if (!Number.isFinite(base)) return null

	const { factor, decimals } = WEIGHT[unit]
	return `${localize(trim(base * factor, decimals), locale)} ${unit}`
}

/** The bare number in the display unit, for joining into "12 × 8 × 3 cm". */
export const convertDimension = (
	cm: string | number | null | undefined,
	unit: DimensionUnit
): string | null => {
	if (cm === null || cm === undefined || cm === "") return null

	const base = Number(cm)
	if (!Number.isFinite(base)) return null

	const { factor, decimals } = DIMENSION[unit]
	return trim(base * factor, decimals)
}

/**
 * German writes 2,5 where English writes 2.5. Falls back to the plain string
 * rather than throwing on a locale tag Intl does not know.
 */
const localize = (value: string, locale?: string): string => {
	if (!locale) return value

	try {
		const n = Number(value)
		return Number.isFinite(n)
			? new Intl.NumberFormat(locale, { maximumFractionDigits: 3 }).format(n)
			: value
	} catch {
		return value
	}
}

export { localize as localizeNumber }
