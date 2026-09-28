/**
 * How many of an option are ordered when it follows the main product.
 *
 * The same rule as the API's `domain/bundle/followQuantity.ts`, and it has to
 * stay the same: this one draws the number on the page and that one writes it
 * to the cart. `unitsPerOption` is how many of the main product one option
 * covers — 1 for a pack per ice cube, 4 for a box of four, so 400 cubes need
 * 100 boxes and 401 need 101. Rounded up: a part-filled box is still a box.
 */
export const followingQuantity = (mainQuantity: number, unitsPerOption: number): number => {
	const per = Number.isFinite(unitsPerOption) && unitsPerOption > 0 ? Math.floor(unitsPerOption) : 1

	return Math.max(1, Math.ceil(mainQuantity / per))
}

export default followingQuantity

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b))

/**
 * The main quantity raised so the chosen packs come out whole.
 *
 * The API's twin is `domain/bundle/followQuantity.ts` and the two must agree:
 * this one draws the number, that one writes it. A hundred ice cubes with a box
 * of six is seventeen boxes holding a hundred and two, so the cubes go up to a
 * hundred and two. Packs of one constrain nothing; two pack sizes at once give
 * their least common multiple.
 */
export const packedMainQuantity = (mainQuantity: number, packSizes: number[]): number => {
	const sizes = packSizes
		.map((size) => (Number.isFinite(size) ? Math.floor(size) : 1))
		.filter((size) => size > 1)

	if (!sizes.length) return mainQuantity

	const step = sizes.reduce((a, b) => (a * b) / gcd(a, b), 1)
	if (step > 1000) return mainQuantity

	return Math.ceil(mainQuantity / step) * step
}

/** How one following option is counted — the API's `FollowRule`. */
export interface FollowRule {
	unitsPerOption: number
	/** Option product ids whose ordered quantities this option adds up. */
	countsOptions: string[]
}

/**
 * Every following option's quantity: boxes from the main quantity, then prints
 * from the boxes — one per chosen box, whatever its size. The client, 28
 * September: 100 cubes in boxes of two is 50 prints; in boxes of four, 25.
 *
 * The API's twin is `domain/bundle/followQuantity.ts`, and the two must agree.
 * A print with no box under it comes to 0, which the page reads as "cannot be
 * ordered yet".
 */
export const followerQuantities = (
	mainQuantity: number,
	followers: { id: string; productId: string; rule: FollowRule }[]
): Map<string, number> => {
	const result = new Map<string, number>()
	const boxes = followers.filter((f) => !f.rule.countsOptions.length)

	for (const box of boxes) {
		result.set(box.id, followingQuantity(mainQuantity, box.rule.unitsPerOption))
	}

	for (const counter of followers.filter((f) => f.rule.countsOptions.length)) {
		const counted = boxes
			.filter((box) => counter.rule.countsOptions.includes(box.productId))
			.reduce((sum, box) => sum + (result.get(box.id) ?? 0), 0)
		result.set(counter.id, counted)
	}

	return result
}
