"use client"

import { useTranslations } from "next-intl"
import { useFieldArray, useFormContext } from "react-hook-form"
import { Plus, Trash2 } from "lucide-react"
import ProInput from "@/components/form/ProInput"
import { Button } from "@/components/ui/button"

/**
 * The bank details a customer needs in order to send the money.
 *
 * Separate labelled fields rather than a paragraph, because this is the one
 * screen where the shop types an IBAN and the one place a customer copies it
 * from. Prose invites both sides to get it wrong; a labelled row does not.
 * Structure also means the thank-you page, the confirmation email and the
 * invoice all render the same details instead of each parsing a blob.
 *
 * A list, because a shop with a euro account and a foreign-currency one has to
 * show both.
 */
export const BankAccountsField = () => {
	const t = useTranslations("admin")
	const { control } = useFormContext()
	const { fields, append, remove } = useFieldArray({ control, name: "bankAccounts" })

	return (
		<div className="space-y-4">
			{!fields.length && (
				<p className="text-muted-foreground rounded-md border border-dashed p-6 text-center text-sm">
					{t("noBankAccountYet")}
				</p>
			)}

			{fields.map((field, index) => (
				<div key={field.id} className="relative rounded-md border p-4">
					<div className="mb-3 flex items-center justify-between gap-2">
						<span className="text-sm font-medium">
							{fields.length > 1 ? `Account ${index + 1}` : t("bankAccount")}
						</span>
						<Button
							type="button"
							variant="ghost"
							size="icon"
							aria-label={t("removeNumbered", { thing: t("accountWord"), index: index + 1 })}
							onClick={() => remove(index)}
						>
							<Trash2 className="text-muted-foreground" />
						</Button>
					</div>

					<div className="grid gap-4 sm:grid-cols-2">
						{/* Only worth showing when there is more than one to tell apart. */}
						{fields.length > 1 && (
							<ProInput
								name={`bankAccounts.${index}.label`}
								label={t("label")}
								placeholder={t("eurAccountExample")}
								description={t("shownAboveThisAccountSoThe")}
							/>
						)}

						<ProInput
							name={`bankAccounts.${index}.accountName`}
							label={t("accountHolder")}
							placeholder={t("asscaGmbh")}
							required
						/>
						<ProInput
							name={`bankAccounts.${index}.bankName`}
							label={t("bankName")}
							placeholder={t("sparkasseSchwarzwaldBaar")}
						/>
						<ProInput
							name={`bankAccounts.${index}.iban`}
							label="IBAN"
							placeholder="DE00 0000 0000 0000 0000 00"
							description={t("theOneThingACustomerInside")}
						/>
						<ProInput
							name={`bankAccounts.${index}.bic`}
							label={t("bicSwift")}
							placeholder="SOLADES1VSS"
						/>
						<ProInput
							name={`bankAccounts.${index}.accountNumber`}
							label={t("accountNumber")}
							placeholder={t("optional")}
							description={t("onlyNeededOutsideSepaTheIban")}
						/>
						<ProInput
							name={`bankAccounts.${index}.countryCode`}
							label={t("country")}
							placeholder="DE"
							description={t("twoLetterCodeTellsAnInternational")}
						/>
					</div>
				</div>
			))}

			<Button
				type="button"
				variant="outline"
				size="sm"
				onClick={() =>
					append({
						label: "",
						accountName: "",
						bankName: "",
						accountNumber: "",
						iban: "",
						bic: "",
						countryCode: "",
					})
				}
			>
				<Plus />
				{fields.length ? t("addAnotherAccount") : t("addBankAccount")}
			</Button>
		</div>
	)
}

export default BankAccountsField
