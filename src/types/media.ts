/** Mirrors the backend media module's `view()` and `listFolders()`. */

export type MediaVisibility = "PUBLIC" | "PRIVATE"

export interface MediaAsset {
	id: string
	visibility: MediaVisibility
	mimeType: string
	sizeBytes: number
	width: number | null
	height: number | null
	originalName: string
	folderId: string | null
	folderName: string | null
	alt: string | null
	caption: string | null
	/**
	 * Null for private files — customer design files never get a public URL.
	 * Reach those through `GET /media/:id/url`, which returns a 5-minute
	 * signed link.
	 */
	url: string | null
	/** thumb · grid · detail · zoom. Empty for private files. */
	derivatives: Record<string, string>
	createdAt: string
}

export interface MediaFolder {
	id: string
	parentId: string | null
	name: string
	sortOrder: number
	assetCount: number
}

export interface MediaFolderNode extends MediaFolder {
	children: MediaFolderNode[]
	depth: number
}

/**
 * Sentinel the API accepts for "nobody filed this".
 *
 * Unfiled assets have folderId = null, which is not a uuid, and an absent
 * folderId already means "no filter" — so this is the only way to ask.
 */
export const UNFILED = "none"

export interface MediaListParams {
	/** A folder id, UNFILED, or undefined for everything. */
	folderId?: string
	visibility?: MediaVisibility
	search?: string
	page?: number
	limit?: number
}
