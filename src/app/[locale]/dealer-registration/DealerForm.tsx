"use client"

import { useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import RegistrationFields from "@/components/auth/RegistrationFields"
import {
	registrationSchema,
	toRegistrationPayload,
	type RegistrationValues,
} from "@/components/auth/registrationSchema"
import ProForm from "@/components/form/ProForm"
import ProSubmit from "@/components/form/ProSubmit"
import SubmitStatus from "@/components/form/SubmitStatus"
import { DEFAULT_COUNTRY } from "@/constants/countries"
import { Link } from "@/i18n/navigation"
import { NETWORK_ERROR } from "@/services/actions/apiFetch"
import applyAsDealer from "@/services/actions/applyAsDealer"
import type { IGenericErrorResponse } from "@/types"

export const DealerForm = () => {
	const t = useTranslations("auth")
	const tv = useTranslations("validation")
	const te = useTranslations("error")
	const locale = useLocale()

	const [submitted, setSubmitted] = useState(false)

	const schema = registrationSchema(
		{
			required: tv("required"),
			email: tv("email"),
			minPassword: tv("minLength", { count: 8 }),
			acceptTerms: t("acceptTerms"),
			vatRequired: t("vatRequiredEu"),
		},
		// Only here, not on ordinary signup: reverse charge is a business-to-
		// business matter, and requiring a VAT ID of a private customer in Austria
		// would refuse them over a number they do not have.
		{ requireVatForEu: true }
	)

	const onSubmit = async (values: RegistrationValues) => {
		try {
			const payload = toRegistrationPayload(values)

			const result = await applyAsDealer({
				...payload,
				// The dealer endpoint calls it companyName; the shared form field is
				// `company`, matching the B2C endpoint and the User model.
				companyName: payload.company,
				company: undefined,
				locale,
			})

			if (!result?.success) {
				toast.error(result?.message ?? te("genericTitle"))
				return
			}

			// Deliberately no redirect and no auto sign-in. The account exists but is
			// PENDING, so sending them into the shop would only show guest prices
			// (R5b) and look like the application failed.
			setSubmitted(true)
		} catch (error) {
			const failure = error as IGenericErrorResponse
			toast.error(
				failure?.statusCode === NETWORK_ERROR
					? te("network")
					: (failure?.message ?? te("genericTitle"))
			)
		}
	}

	if (submitted) {
		return (
			<div className="bg-muted/50 space-y-3 rounded-lg border p-6">
				<p className="font-heading text-lg font-semibold">{t("dealerSubmittedTitle")}</p>
				<p className="text-muted-foreground text-sm">{t("dealerSubmittedBody")}</p>
				<Link
					href="/login"
					className="inline-block text-sm underline underline-offset-4"
				>
					{t("signIn")}
				</Link>
			</div>
		)
	}

	return (
		<ProForm
			onSubmit={onSubmit}
			resolver={zodResolver(schema)}
			defaultValues={{ countryCode: DEFAULT_COUNTRY, psiMember: "no" }}
			className="space-y-8"
		>
			<RegistrationFields requireVatForEu />
			<ProSubmit className="w-full" pendingLabel={t("submittingRegistration")}>
				{t("dealerTitle")}
			</ProSubmit>

			{/* Only if the request is actually slow — see SubmitStatus. */}
			<SubmitStatus message={t("submittingRegistrationSlow")} />
		</ProForm>
	)
}

export default DealerForm
