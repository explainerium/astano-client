"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Check, Copy } from "lucide-react"
import type { BankAccount } from "@/types/payment"

/**
 * The bank details on a placed order, laid out to be copied from.
 *
 * A customer reads this with their banking app open beside it, so every value
 * gets its own labelled row and the IBAN gets a copy button. An IBAN typed by
 * hand from a paragraph is how money ends up somewhere else, and recovering a
 * misdirected SEPA transfer takes weeks.
 *
 * These come from the order, not from the shop's current settings — frozen at
 * checkout, so this page keeps agreeing with the confirmation email even after
 * the shop changes bank.
 */

const CopyableValue = ({ value, label }: { value: string; label: string }) => {
	const [copied, setCopied] = useState(false)

	return (
		<span className="flex items-center justify-end gap-2">
			<span className="font-mono text-sm break-all">{value}</span>
			<button
				type="button"
				aria-label={`Copy ${label}`}
				onClick={async () => {
					await navigator.clipboard.writeText(value.replace(/\s/g, ""))
					setCopied(true)
					// Long enough to be noticed, short enough that a second copy still
					// gives feedback rather than looking already-done.
					setTimeout(() => setCopied(false), 1800)
				}}
				className="text-muted-foreground hover:text-foreground shrink-0 transition-colors"
			>
				{copied ? <Check className="text-positive size-4" /> : <Copy className="size-4" />}
			</button>
		</span>
	)
}

export const BankAccountDetails = ({ accounts }: { accounts: BankAccount[] }) => {
	const t = useTranslations("checkout")

	if (!accounts.length) return null

	return (
		<div className="mt-4 space-y-4">
			{accounts.map((account, index) => {
				// Empty fields are dropped rather than shown blank — a shop that holds
				// only an IBAN and a BIC should not display four empty rows.
				const rows: { label: string; value: string; copyable?: boolean }[] = [
					{ label: t("bankAccountName"), value: account.accountName },
					{ label: t("bankName"), value: account.bankName ?? "" },
					{ label: t("bankAccountNumber"), value: account.accountNumber ?? "", copyable: true },
					{ label: t("bankIban"), value: account.iban ?? "", copyable: true },
					{ label: t("bankBic"), value: account.bic ?? "", copyable: true },
					{ label: t("bankCountry"), value: account.countryCode ?? "" },
				].filter((row) => row.value)

				return (
					<div key={account.iban ?? account.accountNumber ?? index} className="bg-muted/50 p-4">
						{account.label && (
							<p className="mb-2 text-sm font-semibold">{account.label}</p>
						)}

						<dl className="divide-y divide-neutral-200/70">
							{rows.map((row) => (
								<div key={row.label} className="flex items-baseline justify-between gap-4 py-2">
									<dt className="text-muted-foreground text-sm">{row.label}</dt>
									<dd className="min-w-0 text-right">
										{row.copyable ? (
											<CopyableValue value={row.value} label={row.label} />
										) : (
											<span className="text-sm break-words">{row.value}</span>
										)}
									</dd>
								</div>
							))}
						</dl>
					</div>
				)
			})}

			<p className="text-muted-foreground text-xs">{t("bankReferenceHint")}</p>
		</div>
	)
}

export default BankAccountDetails
