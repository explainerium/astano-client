import type { PublicImage } from "@/types/storefront"

/**
 * The widths the API actually generates, mirroring backend
 * media.constant.ts IMAGE_DERIVATIVES. They have to be repeated here because
 * the API sends the derivative URLs but not their widths, and a srcset without
 * widths is no better than a single src.
 *
 * Keep in step with the backend. A width that is wrong here makes the browser
 * pick the wrong file — too small and it looks soft, too large and the visitor
 * pays for pixels nobody sees.
 */
const DERIVATIVE_WIDTHS: Record<string, number> = {
	thumb: 150,
	grid: 400,
	detail: 920,
	zoom: 1600,
}

/**
 * A srcset covering every derivative the API produced for this image, plus the
 * original.
 *
 * This is what keeps a cropped grid photo sharp. The tile is around 290 CSS
 * pixels wide, so a phone at 3× needs roughly 870 real ones — without a srcset
 * the browser would take the 400px file and stretch it. Derivatives are only
 * generated when the upload is wider than the target, so a small upload simply
 * contributes fewer entries and the browser falls back to the original.
 */
export const srcsetOf = (image: PublicImage): string | undefined => {
	const entries = Object.entries(image.srcset)
		.map(([name, url]) => {
			const width = DERIVATIVE_WIDTHS[name]
			return width ? `${url} ${width}w` : null
		})
		.filter((entry) => entry !== null)

	// The original is the widest thing available and the only one whose width we
	// are told, so it caps the set.
	if (image.width) entries.push(`${image.url} ${image.width}w`)

	return entries.length ? entries.join(", ") : undefined
}

/**
 * How wide a product tile actually renders, for `sizes`.
 *
 * Three across inside a 1280px shell with a 280px filter rail leaves roughly
 * 290px a tile; below that breakpoint the grid is two across, so half the
 * viewport less the page padding.
 */
export const GRID_IMAGE_SIZES = "(min-width: 1024px) 300px, 50vw"

/** The best single URL for a grid tile, when a srcset is not being used. */
export const gridSrcOf = (image: PublicImage): string =>
	image.srcset.grid ?? image.srcset.detail ?? image.url
