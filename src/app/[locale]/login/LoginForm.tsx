"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { z } from "zod"
import ProForm from "@/components/form/ProForm"
import ProInput from "@/components/form/ProInput"
import ProSubmit from "@/components/form/ProSubmit"
import { isStaff } from "@/constants/role"
import { Link } from "@/i18n/navigation"
import { baseApi } from "@/redux/api/baseApi"
import { useAppDispatch } from "@/redux/hooks"
import { NETWORK_ERROR } from "@/services/actions/apiFetch"
import userLogin from "@/services/actions/userLogin"
import type { IGenericErrorResponse, UserStatus } from "@/types"

/**
 * Only same-origin paths are followed.
 *
 * The value arrives from ?redirect= in the URL, which anyone can set. "//evil.com"
 * is a protocol-relative URL that browsers treat as absolute, so checking for a
 * leading "/" alone is not enough to keep this from becoming an open redirect.
 */
const safeRedirect = (value: string | null): string | null =>
	value && value.startsWith("/") && !value.startsWith("//") ? value : null

// A type alias, not an interface: interfaces have no implicit index signature,
// so they are not assignable to the Record<string, unknown> payload the auth
// services take.
type LoginValues = {
	email: string
	password: string
}

export const LoginForm = () => {
	const t = useTranslations("auth")
	const tv = useTranslations("validation")
	const te = useTranslations("error")
	const router = useRouter()
	const searchParams = useSearchParams()
	const dispatch = useAppDispatch()

	// Set when the credentials were right but the account is not approved. The
	// API lets a PENDING dealer sign in precisely so they can read this.
	const [blockedStatus, setBlockedStatus] = useState<UserStatus | null>(null)

	const schema = z.object({
		email: z.string().min(1, tv("required")).email(tv("email")),
		password: z.string().min(1, tv("required")),
	})

	const onSubmit = async (values: LoginValues) => {
		try {
			const result = await userLogin(values)

			if (!result?.success || !result.data?.accessToken) {
				// The API localizes its own messages and returns the same text for a
				// wrong password as for an unknown address, so this is safe to show.
				toast.error(result?.message ?? t("signIn"))
				return
			}

			const user = result.data.user

			if (user.status !== "ACTIVE") {
				setBlockedStatus(user.status)
				return
			}

			// Drop anything cached against the previous (or anonymous) session —
			// otherwise a stale 401 from /auth/me survives the sign-in.
			dispatch(baseApi.util.resetApiState())

			router.replace(
				safeRedirect(searchParams.get("redirect")) ??
					(isStaff(user.role) ? "/admin/dashboard" : "/account")
			)
		} catch (error) {
			// A dead or unreachable API throws NETWORK_ERROR. Anything else that
			// reached the server already carries a localized message from it.
			const failure = error as IGenericErrorResponse
			toast.error(
				failure?.statusCode === NETWORK_ERROR
					? te("network")
					: (failure?.message ?? te("genericTitle"))
			)
		}
	}

	if (blockedStatus) {
		const rejected = blockedStatus === "REJECTED"
		return (
			<div className="bg-muted/50 rounded-lg border p-5 text-sm">
				<p className="font-medium">{rejected ? t("rejectedTitle") : t("pendingTitle")}</p>
				<p className="text-muted-foreground mt-2">
					{rejected ? t("rejectedBody") : t("pendingBody")}
				</p>
			</div>
		)
	}

	return (
		<ProForm onSubmit={onSubmit} resolver={zodResolver(schema)} className="space-y-4">
			<ProInput
				name="email"
				type="email"
				label={t("email")}
				autoComplete="email"
				required
			/>
			<ProInput
				name="password"
				type="password"
				label={t("password")}
				autoComplete="current-password"
				required
			/>

			<ProSubmit className="w-full">{t("signIn")}</ProSubmit>

			<p className="text-center">
				<Link href="/login" className="text-muted-foreground text-sm underline underline-offset-4">
					{t("forgotPassword")}
				</Link>
			</p>
		</ProForm>
	)
}

export default LoginForm
