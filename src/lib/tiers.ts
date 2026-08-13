/**
 * The quantity-ladder vocabulary — one copy, used by every screen that edits a
 * ladder: the product editor, the category dialog and the customer page.
 *
 * In `lib` rather than beside the product form for two reasons. It is no longer
 * the product form's alone, and `ProductForm` renders `QuantityPricing`, so
 * anything the table imported back from the form would be a cycle — and
 * `TIER_TYPES` is read at module evaluation to build the select options, which
 * is exactly when a cycle leaves it undefined.
 */

/**
 * The two audiences a ladder is entered for, in the order they are shown.
 *
 * WholesaleX has three (§4.2) — `wholesalex_guest`, `wholesalex_b2c_users` and
 * the single B2B role — and so did this form, which is what the client asked
 * us to stop: "filling up 3 tables is very much work". Guests and signed-in
 * retail customers were being given the same numbers every single time, so the
 * second table was pure transcription with an opportunity to mistype.
 *
 * Now there are two, and the retail one is stored as GUEST. That is not a
 * shortcut — it is where the resolver's fallback chain terminates, so a B2C
 * customer with no ladder of their own already lands on it, exactly as they
 * already land on the guest *price*. The Reseller ladder stays separate
 * because the real data has it genuinely differing: 25–35 % below retail at
 * every quantity.
 *
 * Keys, not text: these labels appear in the product form and the category
 * dialog, both of which are translated.
 */
export const TIER_ROLES = [
	{
		key: "GUEST" as const,
		labelKey: "tierRoleRetail",
		hintKey: "tierRoleRetailHint",
	},
	{
		key: "RESELLER" as const,
		labelKey: "tierRoleReseller",
		hintKey: "tierRoleResellerHint",
	},
]

export type TierRole = (typeof TIER_ROLES)[number]["key"]

export type TierType = "FIXED_PRICE" | "PERCENTAGE" | "FIXED_AMOUNT"

/**
 * How a rung's amount should be read.
 *
 * Two, not the three the engine supports. `FIXED_AMOUNT` — a flat sum off the
 * base — is deliberately not offered: nobody uses it (all 392 rungs in the live
 * catalogue are fixed prices), and a third way to express one number is where a
 * non-technical admin makes a mistake that stays invisible until a customer is
 * undercharged.
 *
 * The enum keeps the value and the resolver keeps the arithmetic, so a ladder
 * migrated from WordPress carrying one still prices correctly. It simply cannot
 * be *chosen* here — see `TIER_TYPE_LABELS` for how such a rung is displayed.
 */
export const TIER_TYPES: { value: TierType; label: string; suffix: string }[] = [
	{ value: "FIXED_PRICE", label: "Fixed price", suffix: "€ per unit" },
	{ value: "PERCENTAGE", label: "Percentage", suffix: "%" },
]

/**
 * Every type's label, including the one that cannot be selected.
 *
 * A rung already stored as an amount-off has to render as something, and
 * falling back to the raw enum name in the middle of a price table would be
 * worse than naming it.
 */
export const TIER_TYPE_LABELS: Record<TierType, string> = {
	FIXED_PRICE: "Fixed price",
	PERCENTAGE: "Percentage",
	FIXED_AMOUNT: "Amount off",
}

/** The rungs every priced product on the live site uses (§4.2). */
export const STANDARD_LADDER = [100, 250, 500, 1000, 2000, 3000, 4000, 5000]

/**
 * What a unit actually costs at a rung — the same arithmetic as the API's
 * `applyTier`, so the preview beside each row cannot disagree with the till.
 *
 * Returns null when there is nothing to compute from, which is different from
 * zero: "no base price yet" must not render as "free".
 */
export const tierUnitPrice = (
	base: number | null,
	type: TierType,
	amount: number | null
): number | null => {
	if (amount === null || Number.isNaN(amount)) return null
	if (type === "FIXED_PRICE") return amount
	if (base === null || Number.isNaN(base)) return null

	// A percentage over 100 or an oversized amount must not read as a negative
	// price, for the same reason resolvePrice() floors it at zero.
	const value = type === "PERCENTAGE" ? base * (1 - amount / 100) : base - amount
	return Math.max(0, value)
}
