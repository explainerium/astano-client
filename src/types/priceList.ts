/** Mirrors the backend's priceListIo module. */

export type PriceRole = "GUEST" | "B2C" | "RESELLER"

/** Where a ladder's base price came from — see the backend's `planLadders`. */
export type BaseSource = "own-list" | "standard-below-minimum" | "own-lowest-rung"

export interface PriceListAnalysis {
	delimiter: string
	headers: string[]
	columns: { sku: string | null; list: string | null; quantity: string | null; price: string | null }
	rowCount: number
	lists: { list: string; rows: number; role: PriceRole | null }[]
	articlesInFile: number
	/** How many of those articles this shop actually sells. */
	articlesInShop: number
	unreadableRows: number
	sample: { sku: string; list: string; minQuantity: number | null; price: string | null }[]
}

export interface LadderReport {
	sku: string
	role: PriceRole
	action: "written" | "skipped"
	basePrice: string
	baseSource: BaseSource
	rungs: number
	/** True when the product stays "on request" despite now having a price. */
	quoteOnly: boolean
	issues: string[]
}

export interface PriceListReport {
	dryRun: boolean
	rowsRead: number
	unreadableRows: number
	articlesInFile: number
	articlesMatched: number
	/** Articles in the file this shop does not sell. Ignored, not an error. */
	articlesNotInShop: string[]
	/** The articles the import was limited to; empty when it took the whole file. */
	onlySkus: string[]
	laddersWritten: Partial<Record<PriceRole, number>>
	rungsWritten: number
	quoteOnlyProducts: string[]
	ladders: LadderReport[]
}
