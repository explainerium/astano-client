"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { zodResolver } from "@hookform/resolvers/zod"
import { CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import { z } from "zod"
import ProForm from "@/components/form/ProForm"
import ProInput from "@/components/form/ProInput"
import ProSubmit from "@/components/form/ProSubmit"
import ProTextarea from "@/components/form/ProTextarea"
import { useSubmitContactMutation } from "@/redux/api/storefrontApi"

const schema = z.object({
	name: z.string().trim().min(1).max(160),
	email: z.string().trim().email(),
	phone: z.string().trim().max(50),
	company: z.string().trim().max(200),
	subject: z.string().trim().max(200),
	message: z.string().trim().min(1).max(5000),
	/**
	 * Honeypot. Hidden from real users, so anything in it came from a bot.
	 * The API is deliberately permissive about the field and decides in the
	 * handler — a validation error would tell the bot which field caught it.
	 */
	website: z.string().max(500),
})

type FormValues = z.infer<typeof schema>

export const ContactForm = () => {
	const t = useTranslations("contact")
	const [submitContact] = useSubmitContactMutation()
	const [sent, setSent] = useState(false)

	const onSubmit = async (form: FormValues) => {
		try {
			await submitContact({
				name: form.name.trim(),
				email: form.email.trim(),
				message: form.message.trim(),
				...(form.phone.trim() ? { phone: form.phone.trim() } : {}),
				...(form.company.trim() ? { company: form.company.trim() } : {}),
				...(form.subject.trim() ? { subject: form.subject.trim() } : {}),
				...(form.website ? { website: form.website } : {}),
			}).unwrap()
			setSent(true)
		} catch (error) {
			const message = (error as { data?: { message?: string } })?.data?.message
			toast.error(message ?? t("error"))
		}
	}

	if (sent) {
		return (
			<div className="flex items-start gap-3 border bg-white p-8">
				<CheckCircle2 className="text-primary mt-0.5 size-5 shrink-0" />
				<p className="text-sm">{t("success")}</p>
			</div>
		)
	}

	return (
		<ProForm
			onSubmit={onSubmit}
			resolver={zodResolver(schema)}
			defaultValues={{
				name: "",
				email: "",
				phone: "",
				company: "",
				subject: "",
				message: "",
				website: "",
			}}
			className="space-y-4 border bg-white p-6 sm:p-8"
		>
			<div className="grid gap-4 sm:grid-cols-2">
				<ProInput name="name" label={t("fields.name")} required />
				<ProInput name="email" type="email" label={t("fields.email")} required />
				<ProInput name="phone" label={t("fields.phone")} />
				<ProInput name="company" label={t("fields.company")} />
			</div>

			<ProInput name="subject" label={t("fields.subject")} />
			<ProTextarea name="message" label={t("fields.message")} required />

			{/* Off-screen rather than display:none — some bots skip hidden inputs. */}
			<div className="absolute -left-[9999px]" aria-hidden>
				<ProInput name="website" label="Website" tabIndex={-1} autoComplete="off" />
			</div>

			<ProSubmit>{t("submit")}</ProSubmit>
		</ProForm>
	)
}

export default ContactForm
