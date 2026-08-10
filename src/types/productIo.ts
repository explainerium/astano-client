/** Mirrors the backend productIo module. */

export interface ImportField {
	key: string
	label: string
	help?: string
	type: string
	aliases: string[]
}

export interface AnalyseResult {
	delimiter: string
	headers: string[]
	rowCount: number
	/** `header -> field key`, suggested and editable. */
	mapping: Record<string, string>
	attributeColumns: { position: number; nameHeader: string; valueHeader: string }[]
	sample: Record<string, string>[]
	fields: ImportField[]
}

export interface ImportOptions {
	/** A row with no price becomes price-on-request rather than free. */
	quoteWhenNoPrice: boolean
	downloadImages: boolean
	onExisting: "update" | "skip"
	onNew: "create" | "skip"
}

export type RowAction = "created" | "updated" | "skipped" | "failed"

export interface RowReport {
	/** As numbered in the spreadsheet, header included. */
	line: number
	sku: string | null
	name: string | null
	action: RowAction
	issues: string[]
}

export interface ImportReport {
	dryRun: boolean
	total: number
	created: number
	updated: number
	skipped: number
	failed: number
	categoriesCreated: string[]
	attributesCreated: string[]
	imagesFetched: number
	imagesFailed: number
	rows: RowReport[]
}
