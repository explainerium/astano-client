/** Mirrors the backend b2bApplication module's `view()`. */

/**
 * Decision state lives on the **user**, not the application — one source of
 * truth for whether wholesale pricing applies. A PENDING reseller prices as a
 * guest until an admin approves (rule R5b), so approving is what unlocks the
 * dealer ladder.
 */
export type DealerStatus = "ACTIVE" | "PENDING" | "REJECTED"

export interface DealerApplication {
	id: string
	userId: string
	status: DealerStatus
	email: string
	company: {
		name: string | null
		vatNumber: string | null
		registerNumber: string | null
		foundingDate: string | null
		website: string | null
		businessType: string | null
		expectedVolume: string | null
		psiMember: boolean | null
	}
	address: {
		street: string | null
		street2: string | null
		postcode: string | null
		city: string | null
		countryCode: string | null
	}
	contact: {
		salutation: string | null
		firstName: string | null
		lastName: string | null
		phone: string | null
	}
	message: string | null
	review: {
		reviewedAt: string | null
		reviewedBy: string | null
		note: string | null
	}
	submittedAt: string
}

export interface DealerListParams {
	status?: DealerStatus
	search?: string
	page?: number
	limit?: number
}

export interface DealerDecisionPayload {
	approve: boolean
	note?: string
}
