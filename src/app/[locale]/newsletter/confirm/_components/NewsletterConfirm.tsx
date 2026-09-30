"use client"

import { useEffect, useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { useSearchParams } from "next/navigation"
import { CircleCheck, CircleX, Loader2 } from "lucide-react"
import { Link } from "@/i18n/navigation"
import { useConfirmNewsletterMutation } from "@/redux/api/storefrontApi"

type Outcome = { state: "working" } | { state: "done" } | { state: "failed"; message: string }

/**
 * Spends the token in the URL, once.
 *
 * The link used to point at the API itself, on a path it does not serve, so
 * every confirmation answered 404 in JSON and nobody could subscribe. The same
 * shape as the email-change page: a ref guards against React running the
 * effect twice in development, which would confirm and then report the
 * now-spent link as invalid.
 */
export const NewsletterConfirm = () => {
	const t = useTranslations("newsletterConfirm")
	const token = useSearchParams().get("token")

	const [confirm] = useConfirmNewsletterMutation()
	const [result, setResult] = useState<Outcome | null>(null)
	const started = useRef(false)

	useEffect(() => {
		if (!token || started.current) return
		started.current = true

		confirm(token)
			.unwrap()
			.then(() => setResult({ state: "done" }))
			.catch((error: { data?: { message?: string } }) =>
				setResult({ state: "failed", message: error?.data?.message ?? t("failed") })
			)
	}, [token, confirm, t])

	const outcome: Outcome = !token
		? { state: "failed", message: t("noToken") }
		: (result ?? { state: "working" })

	return (
		<div className="mx-auto w-full max-w-md px-6 py-24 text-center">
			{outcome.state === "working" && (
				<>
					<Loader2 className="text-muted-foreground mx-auto size-8 animate-spin" />
					<p className="text-muted-foreground mt-5 text-sm">{t("working")}</p>
				</>
			)}

			{outcome.state === "done" && (
				<>
					<CircleCheck className="text-positive mx-auto size-12" strokeWidth={1.25} />
					<h1 className="font-heading mt-5 text-2xl font-extrabold tracking-tight">{t("done")}</h1>
					<p className="text-muted-foreground mt-2 text-sm">{t("doneBody")}</p>
				</>
			)}

			{outcome.state === "failed" && (
				<>
					<CircleX className="text-destructive mx-auto size-12" strokeWidth={1.25} />
					<h1 className="font-heading mt-5 text-2xl font-extrabold tracking-tight">
						{t("failedTitle")}
					</h1>
					<p className="text-muted-foreground mt-2 text-sm">{outcome.message}</p>
				</>
			)}

			{outcome.state !== "working" && (
				<Link
					href="/"
					className="bg-ink text-ink-foreground mt-8 inline-block px-6 py-3 text-sm font-semibold tracking-wide uppercase transition-opacity hover:opacity-90"
				>
					{t("toShop")}
				</Link>
			)}
		</div>
	)
}

export default NewsletterConfirm
