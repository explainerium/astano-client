/**
 * Catalogue shapes. Mirrors the backend's category module — if `AdminCategoryView`
 * changes there, this changes with it.
 */

export interface CategoryTranslation {
	locale: string
	name: string
	/** Generated from the name when omitted, with German umlauts transliterated. */
	slug?: string
	description?: string
	metaTitle?: string
	metaDescription?: string
}

/**
 * The staff view. Carries every translation, unlike the public one which
 * collapses to a single resolved language.
 */
/**
 * Enough of an asset to draw a thumbnail without fetching the media library.
 * Same shape the storefront gets — one asset shape across the API.
 */
export interface CategoryAsset {
	id: string
	url: string
	width: number | null
	height: number | null
	/** thumb · grid · detail · zoom, whichever were generated. */
	srcset: Record<string, string>
}

export interface AdminCategory {
	id: string
	parentId: string | null
	sortOrder: number
	isHidden: boolean
	isOptionCategory: boolean
	/** The banner on the category page and in a category grid. Optional. */
	imageAssetId: string | null
	/** A small mark for menus and filters. Optional, and not a resized banner. */
	iconAssetId: string | null
	image: CategoryAsset | null
	icon: CategoryAsset | null
	productCount: number
	translations: CategoryTranslation[]
	createdAt: string
}

/** A category with its children attached, built client-side from parentId. */
export interface CategoryNode extends AdminCategory {
	children: CategoryNode[]
	depth: number
}

export interface CategoryPayload {
	parentId?: string | null
	sortOrder?: number
	isHidden?: boolean
	isOptionCategory?: boolean
	/** Null clears it. Omitted leaves it alone — the two are not the same on a PATCH. */
	imageAssetId?: string | null
	iconAssetId?: string | null
	translations: CategoryTranslation[]
}
