"use client"

import { useState } from "react"
import { Check, Minus, Pencil, Plus, Trash2, Wand2 } from "lucide-react"
import { toast } from "sonner"
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
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table"
import {
	useCreateTaxRateMutation,
	useDeleteTaxClassMutation,
	useDeleteTaxRateMutation,
} from "@/redux/api/taxApi"
import type { TaxClass, TaxRate } from "@/types/tax"
import TaxRateDialog from "./TaxRateDialog"

const regionNames = new Intl.DisplayNames(["en"], { type: "region" })

const countryName = (code: string) => {
	try {
		return regionNames.of(code) ?? code
	} catch {
		return code
	}
}

/** Trailing zeros from Decimal(9,4) read as noise in a table. */
const formatRate = (rate: string) => `${Number(rate)}%`

/**
 * The countries configured on the live site (§3.7) — 19% across the EU rows and
 * 0% for Switzerland. Note this is the shop's actual list, not "the EU": BG, HR,
 * MT and PL are absent from the live configuration and are not invented here.
 */
const LIVE_EU_RATES = [
	"AT", "BE", "HU", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "IE",
	"IT", "LV", "LT", "LU", "NL", "PT", "RO", "SK", "SI", "ES", "SE",
]

const Yes = ({ on }: { on: boolean }) =>
	on ? (
		<Check className="text-positive size-4" aria-label="Yes" />
	) : (
		<Minus className="text-muted-foreground size-4" aria-label="No" />
	)

export const TaxClassCard = ({
	taxClass,
	onEdit,
}: {
	taxClass: TaxClass
	onEdit: () => void
}) => {
	const [createRate] = useCreateTaxRateMutation()
	const [deleteClass] = useDeleteTaxClassMutation()
	const [deleteRate] = useDeleteTaxRateMutation()

	const [rateDialog, setRateDialog] = useState<{ open: boolean; rate?: TaxRate }>({
		open: false,
	})
	const [pending, setPending] = useState<{ kind: "class" } | { kind: "rate"; rate: TaxRate } | null>(
		null
	)
	const [busy, setBusy] = useState(false)

	/**
	 * Fills in the live matrix in one action.
	 *
	 * Twenty-four rows entered one dialog at a time is where a rate gets typed
	 * wrong and nobody notices until an invoice is out. Reverse charge is on for
	 * every country except Germany, because a domestic sale is always taxed
	 * (R10) — which is exactly the rule a human is most likely to get backwards.
	 */
	const seedLiveRates = async () => {
		setBusy(true)
		const existing = new Set(taxClass.rates.map((r) => r.countryCode))
		let added = 0

		// Sequential, so a failure part-way names the country it stopped on
		// rather than leaving 24 concurrent requests in an unknown state.
		for (const countryCode of [...LIVE_EU_RATES, "CH"]) {
			if (existing.has(countryCode)) continue
			try {
				await createRate({
					taxClassId: taxClass.id,
					countryCode,
					name: "Steuer",
					rate: countryCode === "CH" ? "0" : "19",
					appliesToShipping: true,
					priority: 1,
					reverseChargeWithVatId: countryCode !== "DE" && countryCode !== "CH",
					isActive: true,
				}).unwrap()
				added++
			} catch (error) {
				const message = (error as { data?: { message?: string } })?.data?.message
				toast.error(`${countryName(countryCode)} — ${message ?? "could not be added"}`)
				break
			}
		}

		setBusy(false)
		if (added) toast.success(`${added} ${added === 1 ? "rate" : "rates"} added.`)
		else toast.info("Every country in the live matrix already has a rate here.")
	}

	const runDelete = async () => {
		if (!pending) return
		setBusy(true)

		try {
			if (pending.kind === "class") {
				await deleteClass(taxClass.id).unwrap()
				toast.success(`“${taxClass.name}” deleted.`)
			} else {
				await deleteRate(pending.rate.id).unwrap()
				toast.success(`${countryName(pending.rate.countryCode)} rate deleted.`)
			}
			setPending(null)
		} catch (error) {
			// The API refuses a class still attached to products.
			const message = (error as { data?: { message?: string } })?.data?.message
			toast.error(message ?? "Could not delete.")
		}

		setBusy(false)
	}

	return (
		<section className="bg-card overflow-hidden rounded-lg border">
			<header className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
				<h2 className="font-heading text-sm font-semibold">{taxClass.name}</h2>
				<span className="text-muted-foreground font-mono text-xs">{taxClass.code}</span>
				{taxClass.isDefault && (
					<Badge variant="outline" className="border-transparent bg-positive-soft text-positive">
						Default
					</Badge>
				)}

				<div className="ml-auto flex gap-1">
					<Button variant="ghost" size="icon" aria-label={`Edit ${taxClass.name}`} onClick={onEdit}>
						<Pencil />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						className="text-muted-foreground hover:text-destructive"
						aria-label={`Delete ${taxClass.name}`}
						onClick={() => setPending({ kind: "class" })}
					>
						<Trash2 />
					</Button>
				</div>
			</header>

			{!taxClass.rates.length ? (
				<div className="space-y-3 p-8 text-center">
					<p className="text-muted-foreground text-sm">
						No rates yet. Until one matches the shipping country, this class
						charges nothing.
					</p>
					<div className="flex flex-wrap justify-center gap-2">
						<Button variant="outline" size="sm" onClick={() => setRateDialog({ open: true })}>
							<Plus />
							Add rate
						</Button>
						<Button size="sm" disabled={busy} onClick={seedLiveRates}>
							<Wand2 />
							Add the live matrix
						</Button>
					</div>
				</div>
			) : (
				<>
					<div className="overflow-x-auto">
						<Table>
							<TableHeader className="bg-muted/50">
								<TableRow className="hover:bg-transparent">
									{["Country", "Region", "Label", "Rate", "Shipping", "Reverse charge", "Priority", "Active"].map(
										(head) => (
											<TableHead
												key={head}
												className="text-muted-foreground text-xs font-medium tracking-wide uppercase"
											>
												{head}
											</TableHead>
										)
									)}
									<TableHead className="w-20 pr-4" />
								</TableRow>
							</TableHeader>

							<TableBody>
								{taxClass.rates.map((rate) => (
									<TableRow key={rate.id} className={rate.isActive ? undefined : "opacity-60"}>
										<TableCell className="font-medium">
											{countryName(rate.countryCode)}
											<span className="text-muted-foreground ml-1.5 font-mono text-xs">
												{rate.countryCode}
											</span>
										</TableCell>
										<TableCell className="text-muted-foreground text-xs">
											{rate.state || "—"}
										</TableCell>
										<TableCell className="text-muted-foreground text-xs">{rate.name}</TableCell>
										<TableCell className="tabular-nums">{formatRate(rate.rate)}</TableCell>
										<TableCell>
											<Yes on={rate.appliesToShipping} />
										</TableCell>
										<TableCell>
											<Yes on={rate.reverseChargeWithVatId} />
										</TableCell>
										<TableCell className="tabular-nums">{rate.priority}</TableCell>
										<TableCell>
											<Yes on={rate.isActive} />
										</TableCell>
										<TableCell className="pr-4">
											<div className="flex justify-end">
												<Button
													variant="ghost"
													size="icon"
													aria-label={`Edit the ${countryName(rate.countryCode)} rate`}
													onClick={() => setRateDialog({ open: true, rate })}
												>
													<Pencil />
												</Button>
												<Button
													variant="ghost"
													size="icon"
													className="text-muted-foreground hover:text-destructive"
													aria-label={`Delete the ${countryName(rate.countryCode)} rate`}
													onClick={() => setPending({ kind: "rate", rate })}
												>
													<Trash2 />
												</Button>
											</div>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>

					<div className="flex flex-wrap items-center gap-2 border-t px-4 py-2.5">
						<span className="text-muted-foreground text-xs">
							{taxClass.rates.length} {taxClass.rates.length === 1 ? "rate" : "rates"}
						</span>
						<div className="ml-auto flex gap-2">
							<Button variant="outline" size="sm" disabled={busy} onClick={seedLiveRates}>
								<Wand2 />
								Fill gaps from the live matrix
							</Button>
							<Button variant="outline" size="sm" onClick={() => setRateDialog({ open: true })}>
								<Plus />
								Add rate
							</Button>
						</div>
					</div>
				</>
			)}

			{/* Mounted only while open so the form rebuilds per rate — useForm reads
			    defaultValues once. */}
			{rateDialog.open && (
				<TaxRateDialog
					open
					onOpenChange={(open) => !open && setRateDialog({ open: false })}
					taxClassId={taxClass.id}
					rate={rateDialog.rate}
				/>
			)}

			<AlertDialog open={!!pending} onOpenChange={(open) => !open && setPending(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							{pending?.kind === "class"
								? `Delete “${taxClass.name}”?`
								: `Delete the ${pending ? countryName(pending.rate.countryCode) : ""} rate?`}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{pending?.kind === "class"
								? "This removes the class and every rate in it. A class still attached to products cannot be deleted."
								: "Orders in that country will fall through to whichever rate matches next, or to no tax at all."}
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
		</section>
	)
}

export default TaxClassCard
