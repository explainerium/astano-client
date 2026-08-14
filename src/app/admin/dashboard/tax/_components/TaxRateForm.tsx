"use client"

import { useLocale, useTranslations } from "next-intl"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { holdForNavigation } from "@/lib/holdForNavigation"
import { toast } from "sonner"
import { z } from "zod"
import EditorHeader from "@/components/dashboard/shell/EditorHeader"
import ProCheckbox from "@/components/form/ProCheckbox"
import ProCombobox from "@/components/form/ProCombobox"
import ProForm from "@/components/form/ProForm"
import ProInput from "@/components/form/ProInput"
import ProSubmit from "@/components/form/ProSubmit"
import { Button } from "@/components/ui/button"
import { countryOptions } from "@/constants/countries"
import { useCreateTaxRateMutation, useUpdateTaxRateMutation } from "@/redux/api/taxApi"
import type { TaxRate, TaxRatePayload } from "@/types/tax"

/** The dashboard translator, as a type these builders can take. */
type T = (key: string, values?: Record<string, string | number | Date>) => string

const buildSchema = (t: T) =>
	z.object({
	countryCode: z.string().trim().length(2, t("chooseACountry")),
	state: z.string().trim().max(60),
	name: z.string().trim().min(1, t("required")).max(120),
	// Decimal(9,4) on the column, so up to four places. Stays a string all the
	// way to the API — a float would round 19.0000 into something else.
	rate: z
		.string()
		.trim()
		.min(1, t("required"))
		.refine((value) => /^\d+(\.\d{1,4})?$/.test(value), { message: t("useANumberLike19") }),
	appliesToShipping: z.boolean(),
	priority: z.number({ message: t("enterANumber") }).int().min(1, t("atLeastOne")),
	reverseChargeWithVatId: z.boolean(),
	isActive: z.boolean(),
})

type FormValues = z.infer<ReturnType<typeof buildSchema>>

const toDefaults = (rate?: TaxRate): FormValues => ({
	countryCode: rate?.countryCode ?? "",
	state: rate?.state ?? "",
	// "Steuer" is the label the live invoices carry (§3.7).
	name: rate?.name ?? "Steuer",
	// Trailing zeros from Decimal(9,4) would show as "19.0000" in the field.
	rate: rate ? String(Number(rate.rate)) : "",
	appliesToShipping: rate?.appliesToShipping ?? true,
	priority: rate?.priority ?? 1,
	reverseChargeWithVatId: rate?.reverseChargeWithVatId ?? false,
	isActive: rate?.isActive ?? true,
})

export const TaxRateForm = ({
	taxClassId,
	rate,
}: {
	taxClassId: string
	rate?: TaxRate
}) => {
	const t = useTranslations("admin")
	const locale = useLocale()
	const router = useRouter()
	const [createTaxRate] = useCreateTaxRateMutation()
	const [updateTaxRate] = useUpdateTaxRateMutation()

	const isEdit = !!rate

	/*
	 * Back to the list, not to the class's own page.
	 *
	 * The list is where every class shows its full rate table, and a rate is
	 * read against its neighbours — a duplicate country or a priority clash is
	 * only visible beside them. The class page holds the class's own settings
	 * and would show this rate on its own, which is the least useful view of it.
	 */
	const backHref = "/admin/dashboard/tax"

	const onSubmit = async (form: FormValues) => {
		const payload: TaxRatePayload = {
			countryCode: form.countryCode,
			// Empty means "the whole country", which is null rather than "".
			state: form.state.trim() || null,
			name: form.name.trim(),
			rate: form.rate.trim(),
			appliesToShipping: form.appliesToShipping,
			priority: form.priority,
			reverseChargeWithVatId: form.reverseChargeWithVatId,
			isActive: form.isActive,
		}

		try {
			if (isEdit) {
				await updateTaxRate({ id: rate.id, data: payload }).unwrap()
				toast.success(t("rateUpdated"))
			} else {
				await createTaxRate({ ...payload, taxClassId }).unwrap()
				toast.success(t("rateAdded"))
			}
			return holdForNavigation(() => router.push(backHref))
		} catch (error) {
			// The API refuses a duplicate (class, country, state, priority).
			const message = (error as { data?: { message?: string } })?.data?.message
			toast.error(message ?? t("couldNotSaveTheRate"))
		}
	}

	return (
		<div className="space-y-6">
			<EditorHeader
				backHref={backHref}
				backLabel={t("allTaxClasses")}
				title={isEdit ? `${rate.countryCode} · ${rate.name}` : t("newRate")}
				description={
					<>{t("taxIsWorkedOutFromThe")}<strong>shipping</strong> address (R10).
					</>
				}
			/>

			<ProForm
				key={rate?.id ?? "new"}
				onSubmit={onSubmit}
				resolver={zodResolver(buildSchema(t))}
				defaultValues={toDefaults(rate)}
				className="space-y-6"
			>
				<div className="bg-card space-y-5 rounded-lg border p-5">
					<div className="grid gap-4 sm:grid-cols-2">
						<ProCombobox
							name="countryCode"
							label={t("country")}
							options={countryOptions(locale)}
							placeholder={t("chooseACountry")}
						/>
						<ProInput
							name="state"
							label={t("region")}
							description={t("optionalLeaveEmptyForTheWhole")}
						/>
					</div>

					<div className="grid gap-4 sm:grid-cols-2">
						<ProInput
							name="rate"
							label={t("rate")}
							description={t("19ForTheStandardGermanRate")}
							placeholder="19"
							required
						/>
						<ProInput
							name="name"
							label={t("invoiceLabel")}
							description={t("appearsOnTheInvoiceLine")}
							required
						/>
					</div>

					<div className="grid gap-4 sm:grid-cols-2">
						<ProInput
							name="priority"
							type="number"
							label={t("priority")}
							description={t("lowerRunsFirstWhenSeveralRates")}
						/>
					</div>

					<div className="space-y-4 border-t pt-4">
						<ProCheckbox
							name="appliesToShipping"
							label={t("taxTheShippingToo")}
							description={t("euRowsBlurb")}
						/>
						<ProCheckbox
							name="reverseChargeWithVatId"
							label={t("reverseChargeForAValidatedVat")}
							description={t("aBusinessInThisCountryWith")}
						/>
						<ProCheckbox
							name="isActive"
							label={t("active")}
							description={t("turnOffToRetireARate")}
						/>
					</div>
				</div>

				<div className="flex justify-end gap-2">
					<Button asChild type="button" variant="ghost">
						<Link href={backHref}>{t("cancel")}</Link>
					</Button>
					<ProSubmit>{isEdit ? t("saveChanges") : t("addRate")}</ProSubmit>
				</div>
			</ProForm>
		</div>
	)
}

export default TaxRateForm
