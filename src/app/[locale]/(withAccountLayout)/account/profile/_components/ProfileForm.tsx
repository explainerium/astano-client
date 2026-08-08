"use client"

import { useMemo } from "react"
import { useLocale, useTranslations } from "next-intl"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { z } from "zod"
import ProForm from "@/components/form/ProForm"
import ProInput from "@/components/form/ProInput"
import ProSelect from "@/components/form/ProSelect"
import ProSubmit from "@/components/form/ProSubmit"
import { useMeQuery, useUpdateProfileMutation } from "@/redux/api/storefrontApi"
import { formatDate } from "@/lib/dates"
import EmailChangeCard from "./EmailChangeCard"

const buildSchema = () =>
	z.object({
		firstName: z.string().trim().max(100),
		lastName: z.string().trim().max(100),
		company: z.string().trim().max(200),
		phone: z.string().trim().max(50),
		vatNumber: z.string().trim().max(30),
		locale: z.string().trim().min(2).max(5),
	})

type FormValues = z.infer<ReturnType<typeof buildSchema>>

/**
 * The editable half of the account.
 *
 * Role and status are absent and always will be: what someone is, and whether
 * they may trade, is a staff decision and never their own. Email has its own
 * card below — it is the sign-in identity, so it changes only once the new
 * address has proved it can receive mail.
 *
 * The VAT number *is* editable, and editing it drops its VIES validation
 * server-side. Reverse charge (R10) depends on that flag, so a freshly typed
 * number has to be checked again before it can zero anyone's tax.
 */
export const ProfileForm = () => {
	const t = useTranslations("account")
	const locale = useLocale()

	const { data: profile, isLoading } = useMeQuery()
	const [updateProfile] = useUpdateProfileMutation()
	const schema = useMemo(() => buildSchema(), [])

	if (isLoading || !profile) {
		return (
			<p className="text-muted-foreground py-16 text-center text-sm">
				<Loader2 className="mr-2 inline size-4 animate-spin" />…
			</p>
		)
	}

	const onSubmit = async (form: FormValues) => {
		try {
			await updateProfile({
				firstName: form.firstName.trim(),
				lastName: form.lastName.trim(),
				company: form.company.trim() || null,
				phone: form.phone.trim() || null,
				vatNumber: form.vatNumber.trim() || null,
				locale: form.locale,
			}).unwrap()
			toast.success(t("saved"))
		} catch (error) {
			const message = (error as { data?: { message?: string } })?.data?.message
			toast.error(message ?? t("saveFailed"))
		}
	}

	return (
		<div className="max-w-2xl space-y-8">
			<dl className="bg-muted/50 grid gap-4 p-6 text-sm sm:grid-cols-2">
				<div>
					<dt className="text-muted-foreground">{t("email")}</dt>
					<dd className="font-medium">{profile.email}</dd>
				</div>
				<div>
					<dt className="text-muted-foreground">{t("memberSince")}</dt>
					<dd className="font-medium">{formatDate(profile.createdAt, locale)}</dd>
				</div>
			</dl>

			<p className="text-muted-foreground text-sm leading-relaxed">{t("profileNote")}</p>

			<ProForm
				onSubmit={onSubmit}
				resolver={zodResolver(schema)}
				defaultValues={{
					firstName: profile.firstName ?? "",
					lastName: profile.lastName ?? "",
					company: profile.company ?? "",
					phone: profile.phone ?? "",
					vatNumber: profile.vatNumber ?? "",
					locale: profile.locale ?? "de",
				}}
				className="space-y-5"
			>
				<div className="grid gap-5 sm:grid-cols-2">
					<ProInput name="firstName" label={t("firstName")} autoComplete="given-name" />
					<ProInput name="lastName" label={t("lastName")} autoComplete="family-name" />
					<ProInput name="company" label={t("company")} autoComplete="organization" />
					<ProInput name="phone" type="tel" label={t("phone")} autoComplete="tel" />
					<ProInput
						name="vatNumber"
						label={t("vatNumber")}
						description={t("vatNumberNote")}
					/>
					<ProSelect
						name="locale"
						label={t("language")}
						options={[
							{ value: "de", label: "Deutsch" },
							{ value: "en", label: "English" },
						]}
					/>
				</div>

				<ProSubmit pendingLabel={t("saving")} className="rounded-none uppercase">
					{t("save")}
				</ProSubmit>
			</ProForm>

			<EmailChangeCard currentEmail={profile.email} />
		</div>
	)
}

export default ProfileForm
