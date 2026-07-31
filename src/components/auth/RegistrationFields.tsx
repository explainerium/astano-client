"use client"

import { useMemo } from "react"
import { useLocale, useTranslations } from "next-intl"
import ProCheckbox from "@/components/form/ProCheckbox"
import ProCombobox from "@/components/form/ProCombobox"
import ProDatePicker from "@/components/form/ProDatePicker"
import ProInput from "@/components/form/ProInput"
import ProRadioGroup from "@/components/form/ProRadioGroup"
import ProSelect from "@/components/form/ProSelect"
import { countryOptions } from "@/constants/countries"

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
	<fieldset className="space-y-4">
		<legend className="font-heading mb-4 text-sm font-semibold tracking-wide uppercase">
			{title}
		</legend>
		{children}
	</fieldset>
)

/**
 * The 16 registration fields, shared by B2C signup and the dealer application.
 *
 * Rendered identically in both places on purpose — the live site asks the same
 * questions either way, and a customer who applies as a dealer after signing up
 * as B2C should not meet a different form.
 */
export const RegistrationFields = () => {
	const t = useTranslations("auth")
	const tc = useTranslations("common")
	const locale = useLocale()

	// ~250 entries sorted by the active language's collation — worth memoising.
	const countries = useMemo(() => countryOptions(locale), [locale])

	// Values are stored in English, the project's primary language, and only the
	// label is translated. Storing "Herr" would mean the same person reads as
	// something different depending on which language they signed up in.
	const salutations = [
		{ label: t("salutationMr"), value: "Mr" },
		{ label: t("salutationMs"), value: "Ms" },
	]

	const yesNo = [
		{ label: tc("yes"), value: "yes" },
		{ label: tc("no"), value: "no" },
	]

	return (
		<div className="space-y-8">
			<Section title={t("sectionContact")}>
				<ProSelect
					name="salutation"
					label={t("salutation")}
					placeholder={t("pleaseSelect")}
					options={salutations}
					className="sm:max-w-56"
				/>

				<div className="grid gap-4 sm:grid-cols-2">
					<ProInput name="firstName" label={t("firstName")} autoComplete="given-name" required />
					<ProInput name="lastName" label={t("lastName")} autoComplete="family-name" required />
				</div>

				<ProInput name="email" type="email" label={t("email")} autoComplete="email" required />

				<ProInput
					name="phone"
					type="tel"
					label={t("phone")}
					description={t("phoneHint")}
					autoComplete="tel"
				/>

				<ProInput
					name="password"
					type="password"
					label={t("password")}
					description={t("passwordHint")}
					autoComplete="new-password"
					required
				/>
			</Section>

			<Section title={t("sectionBusiness")}>
				<ProInput
					name="company"
					label={t("company")}
					description={t("companyHint")}
					autoComplete="organization"
					required
				/>

				<div className="grid gap-4 sm:grid-cols-2">
					<ProDatePicker name="foundingDate" label={t("foundingDate")} />
					<ProInput name="vatNumber" label={t("vatNumber")} />
				</div>

				<ProRadioGroup name="psiMember" label={t("psiMember")} options={yesNo} />
			</Section>

			<Section title={t("sectionAddress")}>
				<ProInput
					name="street"
					label={t("street")}
					autoComplete="street-address"
					required
				/>

				<div className="grid gap-4 sm:grid-cols-3">
					<ProInput name="postcode" label={t("postcode")} autoComplete="postal-code" required />
					<ProInput
						name="city"
						label={t("city")}
						autoComplete="address-level2"
						required
						className="sm:col-span-2"
					/>
				</div>

				{/* Combobox rather than a select: ~250 entries is too many to scan,
				    and first-letter jumping cannot find "Netherlands" from "neth". */}
				<ProCombobox
					name="countryCode"
					label={t("country")}
					options={countries}
					required
				/>
			</Section>

			{/* Honeypot. Positioned off-screen rather than display:none, which some
			    bots check for, and taken out of the tab order and autofill so no
			    real person or password manager can reach it. */}
			<div aria-hidden className="absolute -left-[9999px]">
				<label htmlFor="email2">Anti-spam</label>
				<ProInput name="email2" autoComplete="off" tabIndex={-1} />
			</div>

			<ProCheckbox name="acceptedTerms" label={t("acceptTerms")} required />
		</div>
	)
}

export default RegistrationFields
