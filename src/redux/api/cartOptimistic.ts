import type { CartLine, CartView } from "@/types/storefront"

/**
 * What may be painted before the server answers, and what may not.
 *
 * An optimistic update is a guess that is always replaced. That makes it safe
 * for facts the shopper just supplied and unsafe for anything this shop derives
 * — and in this shop almost every number is derived.
 *
 * **Quantity is optimistic.** It is exactly what the customer typed; there is
 * nothing to get wrong, and it is the thing that felt slow.
 *
 * **Removal is optimistic.** A line the customer deleted should go.
 *
 * **Money is not.** A line's unit price depends on the quantity through up to
 * three tier ladders, so `unitPrice × quantity` is only right for products with
 * no ladder — and `CartLine` carries no ladder, so the client cannot tell which
 * case it is in. Crossing a threshold at 100 units would flash €169.00 before
 * settling to €149.00, and a wrong price shown confidently is worse than a
 * price shown a moment late.
 *
 * Worse still for the subtotal: a **category** ladder is measured against
 * everything the customer has from that category, so removing one line can
 * change the price of a *different* one. Nothing local can know that.
 *
 * So the money is left exactly as the server last resolved it and the UI marks
 * it as settling. The quantity moves at once; the prices catch up.
 */

/** Marks the lines whose figures are mid-flight, so the UI can dim just those. */
export interface OptimisticCartView extends CartView {
	/** Line ids whose money is waiting on the server. */
	repricing?: string[]
}

const withRepricing = (draft: OptimisticCartView, id: string) => {
	draft.repricing = [...new Set([...(draft.repricing ?? []), id])]
}

/**
 * Finds a line by id at either level.
 *
 * `items` holds only top-level lines; an option bought alongside one is nested
 * in its parent's `options`. A stepper in the drawer can be on either.
 */
const locate = (
	draft: CartView,
	id: string
): { parentIndex: number; optionIndex: number | null } | null => {
	for (let i = 0; i < draft.items.length; i++) {
		if (draft.items[i].id === id) return { parentIndex: i, optionIndex: null }

		const options = draft.items[i].options ?? []
		for (let j = 0; j < options.length; j++) {
			if (options[j].id === id) return { parentIndex: i, optionIndex: j }
		}
	}
	return null
}

/** Sets a line's quantity, or drops it when the quantity reaches zero. */
export const applyQuantity = (draft: OptimisticCartView, id: string, quantity: number) => {
	const found = locate(draft, id)
	if (!found) return

	// The API treats 0 as "remove", and so does the cart page's own input.
	if (quantity <= 0) {
		applyRemoval(draft, id)
		return
	}

	if (found.optionIndex === null) {
		draft.items[found.parentIndex].quantity = quantity
	} else {
		const options = draft.items[found.parentIndex].options as CartLine["options"]
		if (options) options[found.optionIndex].quantity = quantity
	}

	withRepricing(draft, id)
}

/** Removes a line. A parent takes its option lines with it, as the API does. */
export const applyRemoval = (draft: OptimisticCartView, id: string) => {
	const found = locate(draft, id)
	if (!found) return

	if (found.optionIndex === null) {
		draft.items.splice(found.parentIndex, 1)
		draft.lineCount = draft.items.length
	} else {
		const options = draft.items[found.parentIndex].options
		if (options) options.splice(found.optionIndex, 1)
	}

	/**
	 * Counts are exact — they are sums of quantities, not of money — so they can
	 * be recomputed here. The subtotal cannot: removing a line can move another
	 * line's price when a category ladder is in play, and only the server knows.
	 */
	draft.itemCount = draft.items.reduce(
		(n, item) => n + item.quantity + (item.options ?? []).reduce((m, o) => m + o.quantity, 0),
		0
	)

	// Every remaining line's total may have moved. Mark them all as settling
	// rather than pretending only this one changed.
	draft.repricing = draft.items.map((item) => item.id)

	// Nothing to check out when nothing is left. The other direction is the
	// server's to decide — an empty `issues` list would be a claim, not a fact.
	if (!draft.items.length) {
		draft.checkoutReady = false
		draft.subtotal = "0.00"
		draft.issues = []
	}
}

export const applyClear = (draft: OptimisticCartView) => {
	draft.items = []
	draft.itemCount = 0
	draft.lineCount = 0
	draft.subtotal = "0.00"
	draft.issues = []
	draft.checkoutReady = false
	draft.repricing = []
}
