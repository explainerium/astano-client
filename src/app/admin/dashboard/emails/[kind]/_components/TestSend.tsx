"use client"

import { useTranslations } from "next-intl"
import { useState } from "react"
import { Loader2, Send } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useSendEmailTestMutation } from "@/redux/api/emailApi"

/**
 * Sends the sample to a real address.
 *
 * The preview shows the markup; this is the only thing that shows whether mail
 * from this shop actually arrives — whether SMTP is right, whether the domain
 * passes SPF, whether Outlook mangles the table. Those cannot be checked by
 * looking at HTML.
 *
 * Sends the sample content, deliberately: a test that used a real order would
 * mean finding one first, and would put a customer's details in an inbox that
 * has no business holding them.
 */
export const TestSend = ({ kind }: { kind: string }) => {
	const t = useTranslations("admin")
	const [to, setTo] = useState("")
	const [locale, setLocale] = useState("en")
	const [send, { isLoading }] = useSendEmailTestMutation()

	const submit = async (event: React.FormEvent) => {
		event.preventDefault()
		if (!to.trim()) return

		try {
			await send({ kind, to: to.trim(), locale }).unwrap()
			toast.success(`Sent to ${to.trim()}.`)
		} catch (error) {
			const message = (error as { data?: { message?: string } })?.data?.message
			toast.error(message ?? "Could not send the test.")
		}
	}

	return (
		<form onSubmit={submit} className="space-y-3">
			<p className="text-muted-foreground text-sm">{t("sendsThisMessageWithSampleContent")}</p>

			<div className="flex flex-wrap gap-2">
				<Input
					type="email"
					value={to}
					onChange={(event) => setTo(event.target.value)}
					placeholder="you@example.com"
					className="min-w-[200px] flex-1"
					aria-label={t("sendTheTestTo")}
				/>

				<select
					value={locale}
					onChange={(event) => setLocale(event.target.value)}
					aria-label={t("language")}
					className="border-input bg-background h-9 rounded-md border px-3 text-sm"
				>
					<option value="en">{t("english")}</option>
					<option value="de">{t("deutsch")}</option>
				</select>

				<Button type="submit" disabled={isLoading || !to.trim()}>
					{isLoading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
					Send test
				</Button>
			</div>
		</form>
	)
}

export default TestSend
