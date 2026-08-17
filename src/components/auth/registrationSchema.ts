import { z } from "zod"
import { requiresVatId } from "@/lib/euCountries"

export interface RegistrationMessages {
	required: string
	email: string
	minPassword: string
	acceptTerms: string
	/** Only read when `requireVatForEu` is set — see below. */
	vatRequired?: string
}

export interface RegistrationOptions {
	/**
	 * Require a VAT ID from an EU business outside Germany.
	 *
	 * Off by default and on only for the dealer application, because that is
	 * where it means something. Reverse charge applies between businesses, and
	 * requiring it on ordinary signup would refuse a private customer in Austria
	 * over a number they do not have. The server draws the same line: the B2B
	 * schema enforces it, the account schema does not.
	 */
	requireVatForEu?: boolean
}

/**
 * The registration questions, shared by both forms.
 *
 * B2C signup and the dealer application ask exactly the same 16 things (§4.4) —
 * they differ only in what they produce: an ACTIVE B2C account, or a PENDING
 * RESELLER awaiting approval. Keeping one schema means the two can never drift
 * apart field by field.
 *
 * Two deliberate departures from the WordPress original:
 *  - **No username.** Identity is the email address; the API has no username.
 *  - **No confirm-password.** The live form has a single password field, and
 *    adding a second would be a change, not a port.
 *
 * Mirrors the server schema, which validates all of this again.
 */
export const registrationSchema = (m: RegistrationMessages, opts: RegistrationOptions = {}) =>
	z.object({
		// Contact
		salutation: z.string().optional(),
		firstName: z.string().trim().min(1, m.required).max(100),
		lastName: z.string().trim().min(1, m.required).max(100),
		email: z.string().min(1, m.required).email(m.email),
		phone: z.string().trim().max(50).optional(),
		password: z.string().min(8, m.minPassword),

		// Business
		company: z.string().trim().min(1, m.required).max(200),
		// Kept as a string: an empty date input yields "", which z.coerce.date()
		// turns into Invalid Date. Stripped before the request instead.
		foundingDate: z.string().optional(),
		vatNumber: z.string().trim().max(40).optional(),
		// A radio pair, matching the live form's Ja/Nein. Kept as the strings the
		// radio actually produces and converted to the API's boolean on the way
		// out — no .default(), which would make zod's input and output types
		// diverge and stop the resolver matching the form's value type.
		psiMember: z.enum(["yes", "no"]),

		// Address
		street: z.string().trim().min(1, m.required).max(200),
		postcode: z.string().trim().min(1, m.required).max(30),
		city: z.string().trim().min(1, m.required).max(120),
		countryCode: z.string().length(2),

		// Consent — an unchecked box is a refusal, so `true` is the only value.
		acceptedTerms: z.literal(true, { message: m.acceptTerms }),

		// Honeypot. Never shown, never filled by a person.
		email2: z.string().optional(),
	})
		/**
		 * The VAT ID, required of an EU business outside Germany and nobody else.
		 *
		 * A `superRefine` because whether it is required depends on another answer
		 * on the same form, which a field-level rule cannot see. Attached to the
		 * path so the message lands on the box the customer has to fill.
		 */
		.superRefine((values, ctx) => {
			if (!opts.requireVatForEu) return
			if (!requiresVatId(values.countryCode)) return
			if (values.vatNumber?.trim()) return

			ctx.addIssue({
				code: "custom",
				path: ["vatNumber"],
				message: m.vatRequired ?? m.required,
			})
		})

export type RegistrationValues = z.infer<ReturnType<typeof registrationSchema>>

/**
 * Drops empty optionals and the honeypot, and normalises the date.
 *
 * The API validates `foundingDate` with z.coerce.date(); sending "" would make
 * that an Invalid Date and fail the whole request, so an untouched field must
 * be absent rather than empty.
 */
export const toRegistrationPayload = (values: RegistrationValues) => {
	const { email2: _honeypot, foundingDate, psiMember, ...rest } = values

	const payload: Record<string, unknown> = { ...rest, psiMember: psiMember === "yes" }
	if (foundingDate) payload.foundingDate = foundingDate

	for (const key of ["salutation", "phone", "vatNumber"] as const) {
		if (!payload[key]) delete payload[key]
	}

	return payload
}
