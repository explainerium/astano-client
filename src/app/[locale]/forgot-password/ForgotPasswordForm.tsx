"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { zodResolver } from "@hookform/resolvers/zod"
import { MailCheck } from "lucide-react"
import { toast } from "sonner"
import { z } from "zod"
import ProForm from "@/components/form/ProForm"
import ProInput from "@/components/form/ProInput"
import ProSubmit from "@/components/form/ProSubmit"
import SubmitStatus from "@/components/form/SubmitStatus"
import { NETWORK_ERROR } from "@/services/actions/apiFetch"
import requestPasswordReset from "@/services/actions/requestPasswordReset"
import type { IGenericErrorResponse } from "@/types"

export const ForgotPasswordForm = () => {
	const t = useTranslations("auth")
	const tv = useTranslations("validation")
	const te = useTranslations("error")

	const [sentTo, setSentTo] = useState<string | null>(null)

	const schema = z.object({
		email: z.string().min(1, tv("required")).email(tv("email")),
	})

	const onSubmit = async ({ email }: { email: string }) => {
		try {
			await requestPasswordReset(email)

			/*
			 * Confirmed regardless of what the API found.
			 *
			 * It answers identically for a registered address and an unknown one,
			 * on purpose — a form that says "no such account" is a form that tells
			 * a stranger who our customers are. So the screen must not imply an
			 * answer it was not given: "if that address is registered" is the
			 * honest wording, and it is also the only one that stays true.
			 */
			setSentTo(email)
		} catch (error) {
			const failure = error as IGenericErrorResponse
			toast.error(
				failure?.statusCode === NETWORK_ERROR
					? te("network")
					: (failure?.message ?? te("genericTitle"))
			)
		}
	}

	if (sentTo) {
		return (
			<div className="bg-muted/50 rounded-lg border p-5 text-sm">
				<MailCheck className="text-muted-foreground mb-3 size-5" />
				<p className="font-medium">{t("resetSentTitle")}</p>
				<p className="text-muted-foreground mt-2">{t("resetSentBody", { email: sentTo })}</p>
				<p className="text-muted-foreground mt-3 text-xs">{t("resetSentSpam")}</p>
			</div>
		)
	}

	return (
		<ProForm onSubmit={onSubmit} resolver={zodResolver(schema)} className="space-y-4">
			<ProInput name="email" type="email" label={t("email")} autoComplete="email" required />

			<ProSubmit className="w-full" pendingLabel={t("sendingResetLink")}>
				{t("sendResetLink")}
			</ProSubmit>

			<SubmitStatus message={t("signingInSlow")} />
		</ProForm>
	)
}

export default ForgotPasswordForm
