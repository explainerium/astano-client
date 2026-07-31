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
	translations: { locale: string; name: string }[]
	values: AdminAttributeValue[]
}

export interface AttributePayload {
	code: string
	sortOrder: number
	translations: { locale: string; name: string }[]
	values: {
		/** Present when editing an existing value, absent when adding one. */
		id?: string
		code: string
		sortOrder: number
		translations: AttributeValueTranslation[]
	}[]
}
