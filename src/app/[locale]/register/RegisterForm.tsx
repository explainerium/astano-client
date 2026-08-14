"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useLocale, useTranslations } from "next-intl"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { holdForNavigation } from "@/lib/holdForNavigation"
import RegistrationFields from "@/components/auth/RegistrationFields"
import {
	registrationSchema,
	toRegistrationPayload,
	type RegistrationValues,
} from "@/components/auth/registrationSchema"
import ProForm from "@/components/form/ProForm"
import ProSubmit from "@/components/form/ProSubmit"
import { DEFAULT_COUNTRY } from "@/constants/countries"
import { baseApi } from "@/redux/api/baseApi"
import { useAppDispatch } from "@/redux/hooks"
import { NETWORK_ERROR } from "@/services/actions/apiFetch"
import registerUser from "@/services/actions/registerUser"
import type { IGenericErrorResponse } from "@/types"

const safeRedirect = (value: string | null): string | null =>
	value && value.startsWith("/") && !value.startsWith("//") ? value : null

export const RegisterForm = () => {
	const t = useTranslations("auth")
	const tv = useTranslations("validation")
	const te = useTranslations("error")
	const locale = useLocale()
	const router = useRouter()
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

			// A missing token means the honeypot fired: the API answers 201 with no
			// data so a bot learns nothing. Send the visitor to sign in rather than
			// leave them staring at a form that appeared to work.
			if (!result.data?.accessToken) {
				return holdForNavigation(() => router.replace("/login"))
				return
			}

			// Self-registration can only ever produce B2C / ACTIVE — the API refuses
			// a role in the body — so there is no pending state to handle here.
			dispatch(baseApi.util.resetApiState())
			router.replace(safeRedirect(searchParams.get("redirect")) ?? "/account")
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
			<ProSubmit className="w-full">{t("createAccount")}</ProSubmit>
		</ProForm>
	)
}

export default RegisterForm
