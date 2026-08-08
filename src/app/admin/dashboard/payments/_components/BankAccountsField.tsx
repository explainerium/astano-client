"use client"

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
	const { control } = useFormContext()
	const { fields, append, remove } = useFieldArray({ control, name: "bankAccounts" })

	return (
		<div className="space-y-4">
			{!fields.length && (
				<p className="text-muted-foreground rounded-md border border-dashed p-6 text-center text-sm">
					No account added yet. Until one is, the customer is told to pay by transfer with
					nowhere to send it.
				</p>
			)}

			{fields.map((field, index) => (
				<div key={field.id} className="relative rounded-md border p-4">
					<div className="mb-3 flex items-center justify-between gap-2">
						<span className="text-sm font-medium">
							{fields.length > 1 ? `Account ${index + 1}` : "Bank account"}
						</span>
						<Button
							type="button"
							variant="ghost"
							size="icon"
							aria-label={`Remove account ${index + 1}`}
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
								label="Label"
								placeholder="EUR account"
								description="Shown above this account so the customer picks the right one."
							/>
						)}

						<ProInput
							name={`bankAccounts.${index}.accountName`}
							label="Account holder"
							placeholder="ASSCA GmbH"
							required
						/>
						<ProInput
							name={`bankAccounts.${index}.bankName`}
							label="Bank name"
							placeholder="Sparkasse Schwarzwald-Baar"
						/>
						<ProInput
							name={`bankAccounts.${index}.iban`}
							label="IBAN"
							placeholder="DE00 0000 0000 0000 0000 00"
							description="The one thing a customer inside SEPA actually needs."
						/>
						<ProInput
							name={`bankAccounts.${index}.bic`}
							label="BIC / SWIFT"
							placeholder="SOLADES1VSS"
						/>
						<ProInput
							name={`bankAccounts.${index}.accountNumber`}
							label="Account number"
							placeholder="Optional"
							description="Only needed outside SEPA — the IBAN has replaced it within."
						/>
						<ProInput
							name={`bankAccounts.${index}.countryCode`}
							label="Country"
							placeholder="DE"
							description="Two-letter code. Tells an international customer where the money is going."
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
				{fields.length ? "Add another account" : "Add bank account"}
			</Button>
		</div>
	)
}

export default BankAccountsField
