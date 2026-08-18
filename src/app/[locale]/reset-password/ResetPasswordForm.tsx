"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { z } from "zod"
import ProForm from "@/components/form/ProForm"
import ProInput from "@/components/form/ProInput"
import ProSubmit from "@/components/form/ProSubmit"
import SubmitStatus from "@/components/form/SubmitStatus"
import { hardNavigate } from "@/lib/hardNavigate"
import { holdForNavigation } from "@/lib/holdForNavigation"
import { Link, getPathname } from "@/i18n/navigation"
import { NETWORK_ERROR } from "@/services/actions/apiFetch"
import resetPassword from "@/services/actions/resetPassword"
import type { Locale } from "@/i18n/routing"
import type { IGenericErrorResponse } from "@/types"

export const ResetPasswordForm = () => {
	const t = useTranslations("auth")
	const tv = useTranslations("validation")
	const te = useTranslations("error")
	const locale = useLocale()
	const searchParams = useSearchParams()

	const token = searchParams.get("token")
	const [done, setDone] = useState(false)

	const schema = z.object({
		// Matches the API exactly — eight characters, no composition rules. A
		// stricter rule here would reject a password the server would have taken,
		// which reads as a bug in the form rather than a policy.
		password: z.string().min(8, tv("minLength", { count: 8 })),
	})

	const onSubmit = async ({ password }: { password: string }) => {
		if (!token) return

		try {
			const result = await resetPassword(token, password)

			if (!result?.success) {
				// An expired or already-used token lands here, with the API's own
				// localized wording.
				toast.error(result?.message ?? te("genericTitle"))
				return
			}

			setDone(true)

			/*
			 * Sent to sign in, not signed in.
			 *
			 * The reset revoked every refresh token, so there is no session to
			 * resume and issuing one here would quietly undo the logout that is the
			 * whole point. A hard navigation for the same reason the login form
			 * uses one: the guards read a cookie that has just changed.
			 */
			return holdForNavigation(() =>
				hardNavigate(getPathname({ href: "/login", locale: locale as Locale }))
			)
		} catch (error) {
			const failure = error as IGenericErrorResponse
			toast.error(
				failure?.statusCode === NETWORK_ERROR
					? te("network")
					: (failure?.message ?? te("genericTitle"))
			)
		}
	}

	/*
	 * No token, no form.
	 *
	 * Reached by opening the page directly, or by a mail client that truncated
	 * the link. Showing the fields anyway would take a new password, fail on
	 * submit, and leave the visitor believing the password had been rejected
	 * rather than never sent.
	 */
	if (!token) {
		return (
			<div className="bg-muted/50 rounded-lg border p-5 text-sm">
				<p className="font-medium">{t("resetTokenMissingTitle")}</p>
				<p className="text-muted-foreground mt-2">{t("resetTokenMissingBody")}</p>
				<p className="mt-3">
					<Link href="/forgot-password" className="text-foreground underline underline-offset-4">
						{t("requestNewResetLink")}
					</Link>
				</p>
			</div>
		)
	}

	if (done) {
		return (
			<div className="bg-muted/50 rounded-lg border p-5 text-sm">
				<p className="font-medium">{t("resetDoneTitle")}</p>
				<p className="text-muted-foreground mt-2">{t("resetDoneBody")}</p>
			</div>
		)
	}

	return (
		<ProForm onSubmit={onSubmit} resolver={zodResolver(schema)} className="space-y-4">
			<ProInput
				name="password"
				type="password"
				label={t("newPassword")}
				description={t("passwordHint")}
				// "new-password" rather than "current-password": it tells the browser's
				// password manager to offer a generated one and to save what is typed.
				autoComplete="new-password"
				required
			/>

			<ProSubmit className="w-full" pendingLabel={t("savingPassword")}>
				{t("savePassword")}
			</ProSubmit>

			<SubmitStatus message={t("signingInSlow")} />
		</ProForm>
	)
}

export default ResetPasswordForm
