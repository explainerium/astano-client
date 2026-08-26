"use client"

import { useMemo } from "react"
import { useTranslations } from "next-intl"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { z } from "zod"
import ProForm from "@/components/form/ProForm"
import ProInput from "@/components/form/ProInput"
import ProSelect from "@/components/form/ProSelect"
import ProSubmit from "@/components/form/ProSubmit"
import ProTextarea from "@/components/form/ProTextarea"
import { useSellingCountries } from "@/lib/useDeliveryCountries"
import { useSubmitQuoteMutation } from "@/redux/api/storefrontApi"

/**
 * Built from the translations rather than declared at module scope, so a failed
 * field says "Pflichtfeld" instead of Zod's own English "Too small: expected
 * string to have >=1 characters".
 *
 * Which fields are required is the client's list, with one deliberate
 * departure: they marked the address mandatory and left the email address
 * optional. An enquiry is answered by email and by nothing else — the form says
 * so in its own opening line — so an address without one is a question nobody
 * can answer. Required here, and flagged to them.
 */
const buildSchema = (t: (key: string) => string) =>
	z.object({
		company: z.string().trim().min(1, t("required")).max(200),
		salutation: z.string().trim().max(40),
		firstName: z.string().trim().max(100),
		lastName: z.string().trim().min(1, t("required")).max(100),
		street: z.string().trim().min(1, t("required")).max(200),
		houseNumber: z.string().trim().min(1, t("required")).max(30),
		postcode: z.string().trim().min(1, t("required")).max(30),
		city: z.string().trim().min(1, t("required")).max(120),
		countryCode: z.string().trim().max(2),
		phone: z.string().trim().max(50),
		email: z.string().trim().min(1, t("required")).email(t("invalidEmail")),
		message: z.string().trim().max(5000),
	})

type FormValues = z.infer<ReturnType<typeof buildSchema>>

/**
 * Turns the basket into an inquiry.
 *
 * There is no subject field. The client asked for it to go, and they were
 * right: somebody who has just filled a basket has already said what the
 * enquiry is about, and being made to summarise it again is a required field
 * standing between them and sending. Staff still get a subject line — the
 * server writes one from the basket contents.
 *
 * The address is asked for because a quote is a commercial offer: what it costs
 * to make and ship a thousand cutters depends on where they are going, and the
 * client was asking for that by email after every enquiry.
 */
export const QuoteSubmitForm = ({ onSubmitted }: { onSubmitted: () => void }) => {
	const t = useTranslations("quoteBasket")
	const [submitQuote] = useSubmitQuoteMutation()
	const schema = useMemo(() => buildSchema(t), [t])

	/*
	 * Every country the shop will trade with, not only the ones it delivers to.
	 *
	 * An enquiry is a question, and answering one costs nothing — a customer
	 * asking from somewhere the shop does not yet ship to is a customer worth
	 * hearing from. The narrower delivery list belongs at checkout.
	 */
	const { options: countries } = useSellingCountries()

	const salutations = [
		{ label: t("salutationHerr"), value: "Herr" },
		{ label: t("salutationFrau"), value: "Frau" },
		{ label: t("salutationOther"), value: "Divers" },
	]

	const onSubmit = async (form: FormValues) => {
		const optional = (value: string) => (value.trim() ? value.trim() : undefined)

		try {
			await submitQuote({
				message: optional(form.message),
				contactEmail: optional(form.email),
				contactPhone: optional(form.phone),
				contactCompany: optional(form.company),
				contactSalutation: optional(form.salutation),
				contactFirstName: optional(form.firstName),
				contactLastName: optional(form.lastName),
				contactStreet: optional(form.street),
				contactHouseNumber: optional(form.houseNumber),
				contactPostcode: optional(form.postcode),
				contactCity: optional(form.city),
				contactCountryCode: optional(form.countryCode),
			}).unwrap()
			onSubmitted()
		} catch (error) {
			const message = (error as { data?: { message?: string } })?.data?.message
			toast.error(message ?? t("submitFailed"))
		}
	}

	return (
		<ProForm
			onSubmit={onSubmit}
			resolver={zodResolver(schema)}
			defaultValues={{
				company: "",
				salutation: "",
				firstName: "",
				lastName: "",
				street: "",
				houseNumber: "",
				postcode: "",
				city: "",
				countryCode: "DE",
				phone: "",
				email: "",
				message: "",
			}}
			className="space-y-4"
		>
			{/*
			 * One narrow unit, used everywhere something short goes beside
			 * something long: the salutation, the house number, the postcode. The
			 * rows lined up badly when each picked its own width — equal thirds
			 * gave a two-letter house number as much room as a street name.
			 *
			 * Every row is a grid of the same gap, so the fields sit on shared
			 * gridlines down the column rather than each row starting afresh.
			 */}
			<ProInput name="company" label={t("company")} autoComplete="organization" required />

			<div className="grid gap-4 sm:grid-cols-[7rem_1fr_1fr]">
				<ProSelect name="salutation" label={t("salutation")} options={salutations} />
				<ProInput name="firstName" label={t("firstName")} autoComplete="given-name" />
				<ProInput name="lastName" label={t("lastName")} autoComplete="family-name" required />
			</div>

			{/*
			 * Street and house number apart, at the client's request — German
			 * addresses are read that way, and a delivery note that splits them is
			 * easier to transcribe than one that does not.
			 */}
			<div className="grid gap-4 sm:grid-cols-[1fr_7rem]">
				<ProInput name="street" label={t("street")} autoComplete="address-line1" required />
				<ProInput name="houseNumber" label={t("houseNumber")} required />
			</div>

			<div className="grid gap-4 sm:grid-cols-[7rem_1fr]">
				<ProInput name="postcode" label={t("postcode")} autoComplete="postal-code" required />
				<ProInput name="city" label={t("city")} autoComplete="address-level2" required />
			</div>

			<div className="grid gap-4 sm:grid-cols-2">
				<ProSelect name="countryCode" label={t("country")} options={countries} />
				<ProInput name="phone" type="tel" label={t("phone")} autoComplete="tel" />
			</div>

			<ProInput name="email" type="email" label={t("email")} autoComplete="email" required />

			<ProTextarea
				name="message"
				label={t("message")}
				placeholder={t("messagePlaceholder")}
				rows={5}
			/>

			<ProSubmit
				pendingLabel={t("submitting")}
				className="w-full rounded-none uppercase sm:w-auto"
			>
				{t("submit")}
			</ProSubmit>
		</ProForm>
	)
}

export default QuoteSubmitForm
