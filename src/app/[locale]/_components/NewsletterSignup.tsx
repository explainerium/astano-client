"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Loader2, Mail } from "lucide-react"
import { toast } from "sonner"
import { useSubscribeNewsletterMutation } from "@/redux/api/storefrontApi"

/**
 * The newsletter block above the footer.
 *
 * The API answers identically whether the address is new, pending or already
 * confirmed — whether someone is on a mailing list is not for a stranger to
 * discover by typing their address into a form. So this shows one message
 * either way and never reports "already subscribed".
 */
export const NewsletterSignup = () => {
	const t = useTranslations("home.newsletter")
	const [subscribe, { isLoading }] = useSubscribeNewsletterMutation()
	const [email, setEmail] = useState("")

	const onSubmit = async (event: React.FormEvent) => {
		event.preventDefault()
		if (!email.trim()) return

		try {
			const result = await subscribe({ email: email.trim(), source: "footer" }).unwrap()
			toast.success(
				(result as { message?: string })?.message ??
					"Please check your inbox to confirm your subscription."
			)
			setEmail("")
		} catch (error) {
			const message = (error as { data?: { message?: string } })?.data?.message
			toast.error(message ?? "Could not sign you up just now.")
		}
	}

	return (
		<section className="mx-auto w-full max-w-[1400px] px-6 pb-16">
			<div className="bg-muted/60 relative isolate overflow-hidden border">
				<Mail
					className="text-border pointer-events-none absolute -top-4 -left-6 size-40 -rotate-12"
					strokeWidth={1}
					aria-hidden
				/>

				<div className="relative grid gap-8 p-8 lg:grid-cols-2 lg:items-center lg:p-12">
					<div>
						<h2 className="font-heading text-2xl font-extrabold tracking-tight uppercase sm:text-3xl">
							{t("heading")}
						</h2>
						<p className="text-muted-foreground mt-3 text-sm">{t("note")}</p>
					</div>

					<form onSubmit={onSubmit} className="bg-white p-5 shadow-sm">
						<label htmlFor="newsletter-email" className="block text-xs font-medium">
							{t("email")}*
						</label>
						<div className="mt-2 flex flex-wrap gap-3">
							<input
								id="newsletter-email"
								type="email"
								required
								value={email}
								onChange={(event) => setEmail(event.target.value)}
								placeholder={t("placeholder")}
								className="focus:border-primary min-w-0 flex-1 border px-3 py-2.5 text-sm outline-none"
							/>
							<button
								type="submit"
								disabled={isLoading}
								className="bg-primary text-primary-foreground inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold tracking-wide uppercase transition-opacity hover:opacity-90 disabled:opacity-60"
							>
								{isLoading && <Loader2 className="size-4 animate-spin" />}
								{t("submit")}
							</button>
						</div>
					</form>
				</div>
			</div>
		</section>
	)
}

export default NewsletterSignup
