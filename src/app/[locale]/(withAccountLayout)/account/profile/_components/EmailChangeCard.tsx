"use client"

import { useMemo } from "react"
import { useTranslations } from "next-intl"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, MailCheck } from "lucide-react"
import { toast } from "sonner"
import { z } from "zod"
import ProForm from "@/components/form/ProForm"
import ProInput from "@/components/form/ProInput"
import ProSubmit from "@/components/form/ProSubmit"
import { Button } from "@/components/ui/button"
import {
	useCancelEmailChangeMutation,
	usePendingEmailChangeQuery,
	useRequestEmailChangeMutation,
} from "@/redux/api/storefrontApi"

const buildSchema = (t: (key: string) => string) =>
	z.object({
		email: z.string().trim().toLowerCase().email(t("emailInvalid")),
		currentPassword: z.string().min(1, t("passwordRequired")),
	})

type FormValues = z.infer<ReturnType<typeof buildSchema>>

/**
 * Changing the address the account signs in with.
 *
 * Separate from the profile form on purpose, and worded so the two-step nature
 * is obvious *before* the customer submits. The address they are looking at does
 * not change when they press save — a form that appears to have saved something
 * it has not is how people conclude the site is broken and stop trying.
 *
 * The password is asked for because the confirmation link only proves the new
 * mailbox is real. Someone on a borrowed session could otherwise redirect the
 * account to an address of their own and reset the password from there.
 */
export const EmailChangeCard = ({ currentEmail }: { currentEmail: string }) => {
	const t = useTranslations("account")
	const schema = useMemo(() => buildSchema(t), [t])

	const { data: pending, isLoading } = usePendingEmailChangeQuery()
	const [request] = useRequestEmailChangeMutation()
	const [cancel, cancelState] = useCancelEmailChangeMutation()

	const onSubmit = async (form: FormValues) => {
		try {
			await request({ email: form.email, currentPassword: form.currentPassword }).unwrap()
			toast.success(t("emailChangeSent", { email: form.email }))
		} catch (error) {
			const message = (error as { data?: { message?: string } })?.data?.message
			toast.error(message ?? t("saveFailed"))
		}
	}

	if (isLoading) {
		return (
			<div className="border p-6">
				<Loader2 className="text-muted-foreground size-4 animate-spin" />
			</div>
		)
	}

	return (
		<section className="border p-6">
			<h3 className="font-heading text-lg font-bold tracking-tight">{t("emailChangeTitle")}</h3>
			<p className="text-muted-foreground mt-1 text-sm leading-relaxed">
				{t("emailChangeIntro", { email: currentEmail })}
			</p>

			{pending ? (
				/* One waiting change at a time. Showing the form as well would invite a
				   second request that silently cancels the first. */
				<div className="bg-muted/50 mt-5 flex flex-wrap items-start gap-3 p-4">
					<MailCheck className="text-primary mt-0.5 size-5 shrink-0" />
					<div className="min-w-0 flex-1">
						<p className="text-sm font-medium">{t("emailChangePending")}</p>
						<p className="text-muted-foreground mt-0.5 text-sm break-words">
							{pending.pendingEmail}
						</p>
						<p className="text-muted-foreground mt-2 text-xs">{t("emailChangeStillCurrent")}</p>
					</div>
					<Button
						type="button"
						variant="outline"
						size="sm"
						disabled={cancelState.isLoading}
						onClick={async () => {
							try {
								await cancel().unwrap()
								toast.success(t("emailChangeCancelled"))
							} catch (error) {
								const message = (error as { data?: { message?: string } })?.data?.message
								toast.error(message ?? t("saveFailed"))
							}
						}}
					>
						{t("cancel")}
					</Button>
				</div>
			) : (
				<ProForm
					onSubmit={onSubmit}
					resolver={zodResolver(schema)}
					defaultValues={{ email: "", currentPassword: "" }}
					className="mt-5 space-y-5"
				>
					<div className="grid gap-5 sm:grid-cols-2">
						<ProInput
							name="email"
							type="email"
							label={t("newEmail")}
							autoComplete="email"
							placeholder={currentEmail}
						/>
						<ProInput
							name="currentPassword"
							type="password"
							label={t("currentPassword")}
							autoComplete="current-password"
						/>
					</div>

					<ProSubmit pendingLabel={t("saving")} className="rounded-none uppercase">
						{t("sendVerification")}
					</ProSubmit>
				</ProForm>
			)}
		</section>
	)
}

export default EmailChangeCard
