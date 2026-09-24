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
