/** Mirrors the backend attribute module's `adminView()`. */

export interface AttributeValueTranslation {
	locale: string
	label: string
}

export interface AdminAttributeValue {
	id: string
	code: string
	sortOrder: number
	translations: AttributeValueTranslation[]
}

export interface AdminAttribute {
	id: string
	code: string
	sortOrder: number
	/** Products start this attribute as typed text rather than a list. */
	freeText: boolean
	translations: { locale: string; name: string }[]
	values: AdminAttributeValue[]
}

export interface AttributePayload {
	/** Made from the German name when absent. */
	code?: string
	sortOrder: number
	freeText: boolean
	translations: { locale: string; name: string }[]
	values: {
		/** Present when editing an existing value, absent when adding one. */
		id?: string
		/** Made from the German label when absent; an existing value keeps its own. */
		code?: string
		sortOrder: number
		translations: AttributeValueTranslation[]
	}[]
}
