"use client"

import { useEffect, useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { useSearchParams } from "next/navigation"
import { CircleCheck, CircleX, Loader2 } from "lucide-react"
import { Link } from "@/i18n/navigation"
import { useVerifyEmailChangeMutation } from "@/redux/api/storefrontApi"

type Outcome =
	| { state: "working" }
	| { state: "done"; email: string }
	| { state: "failed"; message: string }

/**
 * Consumes the token in the URL, once.
 *
 * The token is spent on use, so firing twice would show a success followed by
 * "this link has expired" — which is exactly the wrong thing to leave on screen.
 * React runs effects twice in development, so the guard is a ref rather than a
 * dependency array.
 */
export const VerifyEmail = () => {
	const t = useTranslations("account")
	const token = useSearchParams().get("token")

	const [verify] = useVerifyEmailChangeMutation()
	const [result, setResult] = useState<Outcome | null>(null)
	const started = useRef(false)

	useEffect(() => {
		// A link with no token has nothing to send. Handled below rather than here:
		// it is knowable during render, and an effect that only sets state is a
		// render the component could have done itself.
		if (!token || started.current) return
		started.current = true

		verify(token)
			.unwrap()
			.then((profile) => setResult({ state: "done", email: profile.email }))
			.catch((error: { data?: { message?: string } }) =>
				setResult({ state: "failed", message: error?.data?.message ?? t("verifyEmailFailed") })
			)
	}, [token, verify, t])

	const outcome: Outcome = !token
		? { state: "failed", message: t("verifyEmailNoToken") }
		: (result ?? { state: "working" })

	return (
		<div className="mx-auto w-full max-w-md px-6 py-24 text-center">
			{outcome.state === "working" && (
				<>
					<Loader2 className="text-muted-foreground mx-auto size-8 animate-spin" />
					<p className="text-muted-foreground mt-5 text-sm">{t("verifyEmailWorking")}</p>
				</>
			)}

			{outcome.state === "done" && (
				<>
					<CircleCheck className="text-positive mx-auto size-12" strokeWidth={1.25} />
					<h1 className="font-heading mt-5 text-2xl font-extrabold tracking-tight">
						{t("verifyEmailDone")}
					</h1>
					<p className="text-muted-foreground mt-2 text-sm break-words">{outcome.email}</p>
					{/* They may have opened this on a device that is not signed in, so the
					    link goes to sign-in rather than assuming a session. */}
					<Link
						href="/account"
						className="bg-ink text-ink-foreground mt-8 inline-block px-6 py-3 text-sm font-semibold tracking-wide uppercase transition-opacity hover:opacity-90"
					>
						{t("verifyEmailToAccount")}
					</Link>
				</>
			)}

			{outcome.state === "failed" && (
				<>
					<CircleX className="text-destructive mx-auto size-12" strokeWidth={1.25} />
					<h1 className="font-heading mt-5 text-2xl font-extrabold tracking-tight">
						{t("verifyEmailFailedTitle")}
					</h1>
					<p className="text-muted-foreground mt-2 text-sm">{outcome.message}</p>
					<p className="text-muted-foreground mt-2 text-sm">{t("verifyEmailRetry")}</p>
					<Link
						href="/account/profile"
						className="bg-ink text-ink-foreground mt-8 inline-block px-6 py-3 text-sm font-semibold tracking-wide uppercase transition-opacity hover:opacity-90"
					>
						{t("verifyEmailToProfile")}
					</Link>
				</>
			)}
		</div>
	)
}

export default VerifyEmail
