"use client"

import { useMemo } from "react"
import { useTranslations } from "next-intl"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { z } from "zod"
import ProForm from "@/components/form/ProForm"
import ProInput from "@/components/form/ProInput"
import ProSubmit from "@/components/form/ProSubmit"
import ProTextarea from "@/components/form/ProTextarea"
import { useSubmitQuoteMutation } from "@/redux/api/storefrontApi"

/**
 * Built from the translations rather than declared at module scope, so a
 * failed field says "Pflichtfeld" instead of Zod's own English
 * "Too small: expected string to have >=1 characters".
 *
 * Name and email are required because the API requires them — a quote nobody
 * can answer is worse than no quote. They are optional in the request schema
 * only so a signed-in customer can inherit them from their account; the
 * storefront has no session yet, so both are always asked for.
 */
const buildSchema = (t: (key: string) => string) =>
	z.object({
		title: z.string().trim().min(1, t("required")).max(200),
		message: z.string().trim().max(5000),
		contactName: z.string().trim().min(1, t("required")).max(160),
		contactEmail: z.string().trim().min(1, t("required")).email(t("invalidEmail")),
		contactPhone: z.string().trim().max(50),
		contactCompany: z.string().trim().max(200),
	})

type FormValues = z.infer<ReturnType<typeof buildSchema>>

/**
 * Turns the basket into an inquiry.
 *
 * The contact fields are optional to the API because a signed-in customer
 * already has them on file. For a guest they are the only way back — so an
 * email address is asked for here even though the server would accept the
 * request without one.
 */
export const QuoteSubmitForm = ({ onSubmitted }: { onSubmitted: () => void }) => {
	const t = useTranslations("quoteBasket")
	const [submitQuote] = useSubmitQuoteMutation()
	const schema = useMemo(() => buildSchema(t), [t])

	const onSubmit = async (form: FormValues) => {
		const optional = (value: string) => (value.trim() ? value.trim() : undefined)

		try {
			await submitQuote({
				title: form.title.trim(),
				message: optional(form.message),
				contactName: optional(form.contactName),
				contactEmail: optional(form.contactEmail),
				contactPhone: optional(form.contactPhone),
				contactCompany: optional(form.contactCompany),
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
				title: "",
				message: "",
				contactName: "",
				contactEmail: "",
				contactPhone: "",
				contactCompany: "",
			}}
			className="space-y-5"
		>
			<ProInput name="title" label={t("subject")} placeholder={t("subjectPlaceholder")} required />
			<ProTextarea name="message" label={t("message")} placeholder={t("messagePlaceholder")} rows={5} />

			<div className="grid gap-5 sm:grid-cols-2">
				<ProInput name="contactName" label={t("name")} autoComplete="name" required />
				<ProInput name="contactEmail" type="email" label={t("email")} autoComplete="email" required />
				<ProInput name="contactPhone" label={t("phone")} autoComplete="tel" />
				<ProInput name="contactCompany" label={t("company")} autoComplete="organization" />
			</div>

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
