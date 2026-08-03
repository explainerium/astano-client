"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { z } from "zod"
import ProCheckbox from "@/components/form/ProCheckbox"
import ProCombobox from "@/components/form/ProCombobox"
import ProForm from "@/components/form/ProForm"
import ProInput from "@/components/form/ProInput"
import ProSubmit from "@/components/form/ProSubmit"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog"
import { countryOptions } from "@/constants/countries"
import { useCreateTaxRateMutation, useUpdateTaxRateMutation } from "@/redux/api/taxApi"
import type { TaxRate, TaxRatePayload } from "@/types/tax"

const schema = z.object({
	countryCode: z.string().trim().length(2, "Choose a country"),
	state: z.string().trim().max(60),
	name: z.string().trim().min(1, "Required").max(120),
	// Decimal(9,4) on the column, so up to four places. Stays a string all the
	// way to the API — a float would round 19.0000 into something else.
	rate: z
		.string()
		.trim()
		.min(1, "Required")
		.refine((value) => /^\d+(\.\d{1,4})?$/.test(value), { message: "Use a number like 19" }),
	appliesToShipping: z.boolean(),
	priority: z.number({ message: "Enter a number" }).int().min(1, "At least 1"),
	reverseChargeWithVatId: z.boolean(),
	isActive: z.boolean(),
})

type FormValues = z.infer<typeof schema>

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

export const TaxRateDialog = ({
	open,
	onOpenChange,
	taxClassId,
	rate,
}: {
	open: boolean
	onOpenChange: (open: boolean) => void
	taxClassId: string
	rate?: TaxRate
}) => {
	const [createTaxRate] = useCreateTaxRateMutation()
	const [updateTaxRate] = useUpdateTaxRateMutation()

	const isEdit = !!rate

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
				toast.success("Rate updated.")
			} else {
				await createTaxRate({ ...payload, taxClassId }).unwrap()
				toast.success("Rate added.")
			}
			onOpenChange(false)
		} catch (error) {
			// The API refuses a duplicate (class, country, state, priority).
			const message = (error as { data?: { message?: string } })?.data?.message
			toast.error(message ?? "Could not save the rate.")
		}
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
				<DialogHeader>
					<DialogTitle>{isEdit ? "Edit rate" : "New rate"}</DialogTitle>
					<DialogDescription>
						Tax is worked out from the <strong>shipping</strong> address (R10).
					</DialogDescription>
				</DialogHeader>

				<ProForm
					key={rate?.id ?? "new"}
					onSubmit={onSubmit}
					resolver={zodResolver(schema)}
					defaultValues={toDefaults(rate)}
					className="space-y-5"
				>
					<div className="grid gap-4 sm:grid-cols-2">
						<ProCombobox
							name="countryCode"
							label="Country"
							options={countryOptions("en")}
							placeholder="Choose a country"
						/>
						<ProInput
							name="state"
							label="Region"
							description="Optional. Leave empty for the whole country."
						/>
					</div>

					<div className="grid gap-4 sm:grid-cols-2">
						<ProInput
							name="rate"
							label="Rate (%)"
							description="19 for the standard German rate, 0 for Switzerland."
							placeholder="19"
							required
						/>
						<ProInput
							name="name"
							label="Invoice label"
							description="Appears on the invoice line."
							required
						/>
					</div>

					<div className="grid gap-4 sm:grid-cols-2">
						<ProInput
							name="priority"
							type="number"
							label="Priority"
							description="Lower runs first when several rates match."
						/>
					</div>

					<div className="space-y-4 border-t pt-4">
						<ProCheckbox
							name="appliesToShipping"
							label="Tax the shipping too"
							description="On for every EU row on the live site."
						/>
						<ProCheckbox
							name="reverseChargeWithVatId"
							label="Reverse charge for a validated VAT ID"
							description="A business in this country with a VAT ID that passes VIES pays 0%. Leave off for Germany — a domestic sale is always taxed (R10)."
						/>
						<ProCheckbox
							name="isActive"
							label="Active"
							description="Turn off to retire a rate without deleting its history."
						/>
					</div>

					<div className="flex justify-end border-t pt-4">
						<ProSubmit>{isEdit ? "Save changes" : "Add rate"}</ProSubmit>
					</div>
				</ProForm>
			</DialogContent>
		</Dialog>
	)
}

export default TaxRateDialog
