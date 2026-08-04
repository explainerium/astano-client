"use client"

import { useState } from "react"
import { Loader2, Pencil, Plus, Trash2, TriangleAlert, Wand2 } from "lucide-react"
import { toast } from "sonner"
import Toolbar from "@/components/dashboard/shell/Toolbar"
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
	useCreatePaymentMethodMutation,
	useDeletePaymentMethodMutation,
	usePaymentMethodsQuery,
} from "@/redux/api/paymentApi"
import type { PaymentMethod } from "@/types/payment"
import PaymentMethodDialog from "./_components/PaymentMethodDialog"

const regionNames = new Intl.DisplayNames(["en"], { type: "region" })

const countryName = (code: string) => {
	try {
		return regionNames.of(code) ?? code
	} catch {
		return code
	}
}

const TYPE_LABEL: Record<string, string> = {
	BANK_TRANSFER: "Bank transfer",
	INVOICE: "Invoice",
	CASH_ON_DELIVERY: "Cash on delivery",
	OTHER: "Other",
}

const ROLE_LABEL: Record<string, string> = {
	GUEST: "guests",
	B2C: "retail customers",
	RESELLER: "dealers",
	SHOP_MANAGER: "shop managers",
	ADMIN: "admins",
}

/** The eligibility rules as a sentence, so nobody has to open the dialog to read them. */
const describeRules = (method: PaymentMethod): string[] => {
	const { rules } = method
	const lines: string[] = []

	if (rules.allowedCountries.length) {
		lines.push(`Only ${rules.allowedCountries.map(countryName).join(", ")}`)
	}
	if (rules.allowedRoles.length) {
		lines.push(`Only ${rules.allowedRoles.map((r) => ROLE_LABEL[r] ?? r).join(", ")}`)
	}
	if (rules.requiresLogin) lines.push("Signed-in customers only")
	if (rules.minCompletedOrders > 0) {
		lines.push(
			`After ${rules.minCompletedOrders} completed ${rules.minCompletedOrders === 1 ? "order" : "orders"}`
		)
	}
	if (rules.minOrderTotal) lines.push(`Orders from €${Number(rules.minOrderTotal)}`)
	if (rules.maxOrderTotal) lines.push(`Orders up to €${Number(rules.maxOrderTotal)}`)
	if (rules.requiresValidatedVatId) lines.push("Validated VAT ID required")

	return lines
}

/**
 * The two gateways enabled on the live site (§3.5).
 *
 * The invoice rule is the interesting one. On WordPress it lives in a WPCode
 * snippet — "show the Invoice gateway only when signed in, with at least one
 * completed order, and a billing country of DE or AT" — which is the single
 * source of gateway-eligibility logic on that site. Here it is three fields.
 *
 * Bank details are deliberately absent: §3.5 records that they are empty in
 * every dump and must come from the client, so the instructions carry a
 * placeholder rather than an invented IBAN.
 */
const LIVE_GATEWAYS = [
	{
		code: "bacs",
		type: "BANK_TRANSFER" as const,
		sortOrder: 0,
		translations: [
			{
				locale: "en",
				title: "Direct bank transfer",
				description:
					"Payment in advance. Available to international customers and first-time buyers from Germany.",
				instructions:
					"TO DO — add the bank account details here. They are shown on the thank-you page and in the confirmation email.",
			},
			{
				locale: "de",
				title: "Direkte Banküberweisung",
				description:
					"Zahlung per Vorkasse. Zahlungsmöglichkeit für Auslandskunden und Erstbesteller aus Deutschland.",
				instructions:
					"TO DO — hier die Bankverbindung eintragen. Sie erscheint auf der Danke-Seite und in der Bestellbestätigung.",
			},
		],
		rules: {},
	},
	{
		code: "invoice",
		type: "INVOICE" as const,
		sortOrder: 1,
		translations: [
			{
				locale: "en",
				title: "Payment by invoice",
				description: "Pay with an invoice processed through our accounting system.",
				instructions: "We'll be in touch shortly to deliver your invoice.",
			},
			{
				locale: "de",
				title: "Zahlung auf Rechnung",
				description: "Zahlung per Rechnung über unsere Buchhaltung.",
				instructions: "Die Rechnung erhalten Sie in Kürze.",
			},
		],
		rules: {
			requiresLogin: true,
			minCompletedOrders: 1,
			allowedCountries: ["DE", "AT"],
		},
	},
]

export default function PaymentPage() {
	const { data: methods, isLoading, isError, error } = usePaymentMethodsQuery()
	const [createMethod] = useCreatePaymentMethodMutation()
	const [deleteMethod] = useDeletePaymentMethodMutation()

	const [dialogOpen, setDialogOpen] = useState(false)
	const [editing, setEditing] = useState<PaymentMethod | undefined>()
	const [pending, setPending] = useState<PaymentMethod | null>(null)
	const [busy, setBusy] = useState(false)

	const openCreate = () => {
		setEditing(undefined)
		setDialogOpen(true)
	}

	const seedLiveGateways = async () => {
		setBusy(true)
		const existing = new Set((methods ?? []).map((m) => m.code))
		let added = 0

		for (const gateway of LIVE_GATEWAYS) {
			if (existing.has(gateway.code)) continue
			try {
				await createMethod({
					code: gateway.code,
					type: gateway.type,
					isActive: true,
					sortOrder: gateway.sortOrder,
					translations: gateway.translations,
					...gateway.rules,
				}).unwrap()
				added++
			} catch (err) {
				const message = (err as { data?: { message?: string } })?.data?.message
				toast.error(`${gateway.code} — ${message ?? "could not be created"}`)
				break
			}
		}

		setBusy(false)
		if (added) toast.success(`${added} ${added === 1 ? "method" : "methods"} created.`)
		else toast.info("Both live gateways already exist.")
	}

	const runDelete = async () => {
		if (!pending) return
		setBusy(true)
		try {
			await deleteMethod(pending.id).unwrap()
			toast.success(`“${pending.title}” deleted.`)
			setPending(null)
		} catch (err) {
			// The API refuses a method already used by an order.
			const message = (err as { data?: { message?: string } })?.data?.message
			toast.error(message ?? "Could not delete the method.")
		}
		setBusy(false)
	}

	const active = methods?.filter((m) => m.isActive) ?? []

	return (
		<div className="space-y-4">
			<Toolbar
				primaryAction={
					<div className="flex gap-2">
						{methods && methods.length > 0 && (
							<Button variant="outline" size="lg" disabled={busy} onClick={seedLiveGateways}>
								<Wand2 />
								Add the live gateways
							</Button>
						)}
						<Button size="lg" onClick={openCreate}>
							<Plus />
							New method
						</Button>
					</div>
				}
			/>

			{isLoading && (
				<div className="bg-card text-muted-foreground flex items-center justify-center gap-2 rounded-lg border p-16 text-sm">
					<Loader2 className="size-4 animate-spin" />
					Loading payment methods…
				</div>
			)}

			{isError && (
				<div className="text-destructive bg-card rounded-lg border border-dashed p-16 text-center text-sm">
					{(error as { data?: { message?: string } })?.data?.message ??
						"Could not load payment methods."}
				</div>
			)}

			{methods && methods.length > 0 && !active.length && (
				<div className="bg-accent-soft flex items-start gap-3 rounded-lg border p-4 text-sm">
					<TriangleAlert className="text-primary mt-0.5 size-4 shrink-0" />
					<p>
						<strong>No active method.</strong> Nobody can complete an order until at
						least one is switched on.
					</p>
				</div>
			)}

			{methods?.length === 0 && (
				<div className="bg-card space-y-4 rounded-lg border border-dashed p-16 text-center">
					<div className="space-y-1">
						<p className="text-sm font-medium">No payment methods yet.</p>
						<p className="text-muted-foreground mx-auto max-w-prose text-sm">
							Checkout cannot finish without one. The live site offers bank
							transfer to everyone and invoice only to returning German and
							Austrian customers.
						</p>
					</div>
					<div className="flex flex-wrap justify-center gap-2">
						<Button variant="outline" onClick={openCreate}>
							<Plus />
							New method
						</Button>
						<Button disabled={busy} onClick={seedLiveGateways}>
							<Wand2 />
							Add the live gateways
						</Button>
					</div>
				</div>
			)}

			{methods?.map((method) => {
				const rules = describeRules(method)

				return (
					<section
						key={method.id}
						className={`bg-card overflow-hidden rounded-lg border ${method.isActive ? "" : "opacity-60"}`}
					>
						<header className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
							<h2 className="font-heading text-sm font-semibold">{method.title}</h2>
							<span className="text-muted-foreground font-mono text-xs">{method.code}</span>
							<Badge variant="outline" className="text-muted-foreground">
								{TYPE_LABEL[method.type] ?? method.type}
							</Badge>
							{method.isActive ? (
								<Badge
									variant="outline"
									className="border-transparent bg-positive-soft text-positive"
								>
									Active
								</Badge>
							) : (
								<Badge
									variant="outline"
									className="border-transparent bg-negative-soft text-negative"
								>
									Inactive
								</Badge>
							)}

							<div className="ml-auto flex gap-1">
								<Button
									variant="ghost"
									size="icon"
									aria-label={`Edit ${method.title}`}
									onClick={() => {
										setEditing(method)
										setDialogOpen(true)
									}}
								>
									<Pencil />
								</Button>
								<Button
									variant="ghost"
									size="icon"
									className="text-muted-foreground hover:text-destructive"
									aria-label={`Delete ${method.title}`}
									onClick={() => setPending(method)}
								>
									<Trash2 />
								</Button>
							</div>
						</header>

						<div className="space-y-2 px-4 py-3">
							{rules.length ? (
								<div className="flex flex-wrap gap-1.5">
									{rules.map((rule) => (
										<Badge key={rule} variant="outline" className="text-muted-foreground">
											{rule}
										</Badge>
									))}
								</div>
							) : (
								<p className="text-muted-foreground text-xs">
									Offered to every customer, in every country.
								</p>
							)}

							{!method.translations.find((t) => t.locale === "en")?.instructions && (
								<p className="text-negative text-xs">
									No instructions — the customer is told nothing about how to pay
									after ordering.
								</p>
							)}
						</div>
					</section>
				)
			})}

			{/* Mounted only while open so the form rebuilds per method — useForm reads
			    defaultValues once. */}
			{dialogOpen && (
				<PaymentMethodDialog open onOpenChange={setDialogOpen} method={editing} />
			)}

			<AlertDialog open={!!pending} onOpenChange={(open) => !open && setPending(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete “{pending?.title}”?</AlertDialogTitle>
						<AlertDialogDescription>
							A method already used by an order cannot be deleted — switch it off
							instead, which keeps the history and stops offering it.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={(event) => {
								event.preventDefault()
								runDelete()
							}}
							disabled={busy}
						>
							{busy ? "Deleting…" : "Delete"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	)
}
