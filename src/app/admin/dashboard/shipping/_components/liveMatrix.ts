/**
 * The five zones and their weight ladders exactly as configured on the live
 * site (§3.6). Kept as data so it can be read against the spec table directly.
 *
 * **Bands are half-open** — `min <= weight < max` — which is the fix §3.6 asks
 * for. The live rules read "0.1 – 15", "15.1 – 30" and so on, and its EU 3
 * ladder had a genuine bug: the top rung started at 320 while the one below it
 * ended at 320, so a cart weighing exactly 320 kg matched two rules. Half-open
 * intervals make that unrepresentable rather than merely fixed once.
 *
 * The first rung starts at 0, not 0.1. On the live site a weightless cart
 * matches no rule at all and silently gets no shipping option; starting at zero
 * means every cart is quoted something, which is the safer failure.
 *
 * Switzerland is deliberately different in two ways: its ladder is coarser
 * between 30 and 90 kg, and its shipping is **not taxed** — the live zone
 * carries tax status "none" because the price excludes import duties.
 */

export interface MatrixZone {
	code: string
	name: { en: string; de: string }
	countries: string[]
	method: {
		code: string
		name: { en: string; de: string }
		description: { en: string; de: string }
		taxable: boolean
	}
	/** [minKg, maxKg | null, costEur] */
	bands: [number, number | null, string][]
}

export const LIVE_MATRIX: MatrixZone[] = [
	{
		code: "de",
		name: { en: "Germany", de: "Deutschland" },
		countries: ["DE"],
		method: {
			code: "versand-de",
			name: { en: "Shipping within Germany", de: "Versandkosten Deutschland" },
			description: { en: "", de: "" },
			taxable: true,
		},
		bands: [
			[0, 15, "8.50"],
			[15, 30, "18"],
			[30, 45, "28"],
			[45, 60, "38"],
			[60, 75, "48"],
			[75, 90, "65"],
			[90, 120, "95"],
			[120, 220, "145"],
			[220, 320, "165"],
			[320, null, "190"],
		],
	},
	{
		code: "eu-1",
		name: { en: "EU 1", de: "EU 1" },
		countries: ["AT", "NL", "LU", "BE"],
		method: {
			code: "versand-eu-1",
			name: { en: "Shipping EU 1", de: "Versandkosten EU 1" },
			description: { en: "", de: "" },
			taxable: true,
		},
		bands: [
			[0, 15, "18"],
			[15, 30, "35"],
			[30, 45, "48"],
			[45, 60, "65"],
			[60, 75, "78"],
			[75, 90, "95"],
			[90, 120, "125"],
			[120, 220, "175"],
			[220, 320, "225"],
			[320, null, "265"],
		],
	},
	{
		code: "eu-2",
		name: { en: "EU 2", de: "EU 2" },
		countries: ["HU", "CZ", "SK", "SI", "PL", "MC", "IT", "FR", "DK"],
		method: {
			code: "versand-eu-2",
			name: { en: "Shipping EU 2", de: "Versandkosten EU 2" },
			description: { en: "", de: "" },
			taxable: true,
		},
		bands: [
			[0, 15, "28"],
			[15, 30, "55"],
			[30, 45, "75"],
			[45, 60, "95"],
			[60, 75, "115"],
			[75, 90, "135"],
			[90, 120, "165"],
			[120, 220, "225"],
			[220, 320, "310"],
			[320, null, "365"],
		],
	},
	{
		code: "eu-3",
		name: { en: "EU 3", de: "EU 3" },
		countries: ["ES", "SE", "HR", "FI", "EE"],
		method: {
			code: "versand-eu-3",
			name: { en: "Shipping EU 3", de: "Versandkosten EU 3" },
			description: { en: "", de: "" },
			taxable: true,
		},
		bands: [
			[0, 15, "35"],
			[15, 30, "65"],
			[30, 45, "95"],
			[45, 60, "115"],
			[60, 75, "130"],
			[75, 90, "165"],
			[90, 120, "195"],
			[120, 220, "275"],
			[220, 320, "355"],
			// The rung §3.6 flags as overlapping on the live site. Half-open
			// intervals settle it: 320.0 kg belongs here and nowhere else.
			[320, null, "410"],
		],
	},
	{
		code: "ch",
		name: { en: "Switzerland", de: "Schweiz" },
		countries: ["CH"],
		method: {
			code: "versand-ch",
			name: { en: "Shipping Switzerland", de: "Versandkosten Schweiz" },
			description: {
				en: "Includes customs declaration. Import duties and taxes are not included.",
				de: "inkl. Zollanmeldung, exkl. Einfuhrabgaben & Steuern",
			},
			// The live Swiss zone carries tax status "none".
			taxable: false,
		},
		bands: [
			[0, 15, "55"],
			[15, 30, "75"],
			[30, 60, "125"],
			[60, 90, "165"],
			[90, 120, "195"],
			[120, 220, "285"],
			[220, 320, "365"],
			[320, null, "415"],
		],
	},
]

export const MATRIX_BAND_COUNT = LIVE_MATRIX.reduce((n, z) => n + z.bands.length, 0)
