"use client"

import { useTranslations } from "next-intl"
import { useState } from "react"
import { CheckCircle2, Loader2, Send, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useTestMailServerMutation } from "@/redux/api/settingApi"
import type { MailTestResult } from "@/types/setting"

/**
 * Sends one real message and reports what the mail server said.
 *
 * Configuring SMTP is four fields and a great many ways to be almost right —
 * the account password where the provider wanted its own SMTP key, port 465
 * where it wanted 587, a from-address on a domain the provider will not send
 * for. Every one of those saves without complaint and then fails silently at
 * the first order, where the only symptom is a customer who never heard back.
 *
 * So the result is shown verbatim. "535 Authentication failed" names the
 * problem; any wording of our own would be a guess at which of the four it was.
 *
 * Kept out of the settings form deliberately. It writes nothing, and a Send
 * button inside a form is a button that submits the form.
 */
export const MailServerTestCard = () => {
	const t = useTranslations("adminSettings")
	const c = useTranslations("adminCommon")

	const [to, setTo] = useState("")
	const [result, setResult] = useState<MailTestResult | null>(null)
	const [testMailServer, { isLoading }] = useTestMailServerMutation()

	const send = async () => {
		setResult(null)

		try {
			setResult(await testMailServer({ to: to.trim() }).unwrap())
		} catch (error) {
			/*
			 * A refused delivery comes back 200 with `ok: false`, so reaching here
			 * means the request itself failed — the admin session expired, the
			 * hourly limit is spent, or the API is unreachable. Rendered in the
			 * same place as a delivery failure because to the person pressing the
			 * button it is the same event: it did not send, and here is why.
			 */
			const data = (error as { data?: { message?: string } })?.data
			setResult({ ok: false, message: data?.message ?? c("saveFailed") })
		}
	}

	const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to.trim())

	return (
		<section className="bg-card space-y-4 rounded-lg border p-5">
			<div>
				<h3 className="text-sm font-semibold">{t("mailTest.title")}</h3>
				<p className="text-muted-foreground mt-1 max-w-prose text-sm">{t("mailTest.blurb")}</p>
			</div>

			<div className="flex flex-col gap-2 sm:flex-row">
				<Input
					type="email"
					value={to}
					onChange={(event) => setTo(event.target.value)}
					placeholder={t("mailTest.placeholder")}
					aria-label={t("mailTest.title")}
					autoComplete="email"
					disabled={isLoading}
					className="sm:max-w-xs"
				/>
				<Button type="button" onClick={send} disabled={!valid || isLoading} aria-busy={isLoading}>
					{isLoading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
					{isLoading ? t("mailTest.sending") : t("mailTest.send")}
				</Button>
			</div>

			{result && (
				// `role="status"` rather than an alert: it is the answer to something
				// the admin just asked for, not an interruption.
				<div
					role="status"
					className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${
						result.ok
							? "border-emerald-600/30 bg-emerald-600/10"
							: "border-destructive/30 bg-destructive/10"
					}`}
				>
					{result.ok ? (
						<CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
					) : (
						<XCircle className="text-destructive mt-0.5 size-4 shrink-0" />
					)}
					<div className="min-w-0">
						{/* Wrapped, not truncated. An SMTP refusal is a paragraph, and the
						    end of it is usually the part that names the cause. */}
						<p className="break-words">{result.message}</p>
						{result.host && (
							<p className="text-muted-foreground mt-1 text-xs">
								{result.source === "environment"
									? t("mailTest.viaEnvironment", { host: result.host })
									: t("mailTest.viaSettings", { host: result.host })}
							</p>
						)}
					</div>
				</div>
			)}
		</section>
	)
}

export default MailServerTestCard
