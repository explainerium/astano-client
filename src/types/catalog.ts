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
export interface AdminCategory {
	id: string
	parentId: string | null
	sortOrder: number
	isHidden: boolean
	isOptionCategory: boolean
	imageAssetId: string | null
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
	translations: CategoryTranslation[]
}
