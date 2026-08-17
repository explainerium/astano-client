"use client"

import { useSearchParams } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { hardNavigate } from "@/lib/hardNavigate"
import { holdForNavigation } from "@/lib/holdForNavigation"
import { getPathname } from "@/i18n/navigation"
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
import { baseApi } from "@/redux/api/baseApi"
import { useAppDispatch } from "@/redux/hooks"
import { NETWORK_ERROR } from "@/services/actions/apiFetch"
import registerUser from "@/services/actions/registerUser"
import type { Locale } from "@/i18n/routing"
import type { IGenericErrorResponse } from "@/types"

const safeRedirect = (value: string | null): string | null =>
	value && value.startsWith("/") && !value.startsWith("//") ? value : null

export const RegisterForm = () => {
	const t = useTranslations("auth")
	const tv = useTranslations("validation")
	const te = useTranslations("error")
	const locale = useLocale()
	const searchParams = useSearchParams()
	const dispatch = useAppDispatch()

	const schema = registrationSchema({
		required: tv("required"),
		email: tv("email"),
		minPassword: tv("minLength", { count: 8 }),
		acceptTerms: t("acceptTerms"),
	})

	const onSubmit = async (values: RegistrationValues) => {
		try {
			const result = await registerUser({
				...toRegistrationPayload(values),
				// Stored on the account and used to choose the language of every
				// transactional email afterwards.
				locale,
			})

			if (!result?.success) {
				toast.error(result?.message ?? te("genericTitle"))
				return
			}

			/**
			 * Both destinations go through `getPathname`, and both are full page
			 * loads.
			 *
			 * German is the default locale and is served unprefixed, so the account
			 * page is `/mein-konto` and sign-in is `/anmelden`. The literal
			 * `/account` and `/login` are the *English* route names, which resolve
			 * to nothing in German — so this used to navigate a new customer
			 * nowhere at all. A page load rather than a client navigation because a
			 * new session has just been written to a cookie every guard reads.
			 */
			const to = (href: "/account" | "/login") =>
				getPathname({ href, locale: locale as Locale })

			// A missing token means the honeypot fired: the API answers 201 with no
			// data so a bot learns nothing. Send the visitor to sign in rather than
			// leave them staring at a form that appeared to work.
			if (!result.data?.accessToken) {
				return holdForNavigation(() => hardNavigate(to("/login")))
			}

			// Self-registration can only ever produce B2C / ACTIVE — the API refuses
			// a role in the body — so there is no pending state to handle here.
			dispatch(baseApi.util.resetApiState())

			// Held like the sign-in form's: without it the button stopped spinning
			// the moment the API answered, while the page it was waiting for had
			// not begun to load.
			return holdForNavigation(() =>
				hardNavigate(safeRedirect(searchParams.get("redirect")) ?? to("/account"))
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

	return (
		<ProForm
			onSubmit={onSubmit}
			resolver={zodResolver(schema)}
			defaultValues={{ countryCode: DEFAULT_COUNTRY, psiMember: "no" }}
			className="space-y-8"
		>
			<RegistrationFields />
			<ProSubmit className="w-full" pendingLabel={t("submittingRegistration")}>
				{t("createAccount")}
			</ProSubmit>

			{/* Only if the request is actually slow — see SubmitStatus. */}
			<SubmitStatus message={t("submittingRegistrationSlow")} />
		</ProForm>
	)
}

export default RegisterForm
