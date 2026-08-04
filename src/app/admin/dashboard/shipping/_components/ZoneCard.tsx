"use client"

import { useState } from "react"
import { Pencil, Plus, Trash2 } from "lucide-react"
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
	useDeleteShippingMethodMutation,
	useDeleteShippingZoneMutation,
} from "@/redux/api/shippingApi"
import type { ShippingMethod, ShippingZone } from "@/types/shipping"
import MethodDialog from "./MethodDialog"

const regionNames = new Intl.DisplayNames(["en"], { type: "region" })

const countryName = (code: string) => {
	try {
		return regionNames.of(code) ?? code
	} catch {
		return code
	}
}

const TYPE_LABEL: Record<string, string> = {
	WEIGHT_BANDED: "Weight bands",
	FLAT_RATE: "Flat rate",
	FREE_SHIPPING: "Free shipping",
	PRICE_BANDED: "Order-value bands",
}

const num = (value: string) => String(Number(value))

/** "0 – 15 kg" · "320 kg and above". */
const bandRange = (min: string, max: string | null, unit: string) =>
	max === null ? `${num(min)} ${unit} and above` : `${num(min)} – ${num(max)} ${unit}`

const MethodBlock = ({
	method,
	onEdit,
	onDelete,
}: {
	method: ShippingMethod
	onEdit: () => void
	onDelete: () => void
}) => {
	const unit = method.type === "PRICE_BANDED" ? "€" : "kg"

	return (
		<div className={method.isActive ? undefined : "opacity-60"}>
			<div className="flex flex-wrap items-center gap-2 px-4 py-3">
				<span className="text-sm font-medium">{method.name}</span>
				<span className="text-muted-foreground font-mono text-xs">{method.code}</span>
				<Badge variant="outline" className="text-muted-foreground">
					{TYPE_LABEL[method.type] ?? method.type}
				</Badge>
				{!method.taxable && (
					<Badge variant="outline" className="text-muted-foreground">
						Not taxed
					</Badge>
				)}
				{!method.isActive && (
					<Badge variant="outline" className="border-transparent bg-negative-soft text-negative">
						Inactive
					</Badge>
				)}

				<div className="ml-auto flex gap-1">
					<Button variant="ghost" size="icon" aria-label={`Edit ${method.name}`} onClick={onEdit}>
						<Pencil />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						className="text-muted-foreground hover:text-destructive"
						aria-label={`Delete ${method.name}`}
						onClick={onDelete}
					>
						<Trash2 />
					</Button>
				</div>
			</div>

			{method.description && (
				<p className="text-muted-foreground -mt-1 px-4 pb-2 text-xs">{method.description}</p>
			)}

			<div className="px-4 pb-4">
				{method.type === "FLAT_RATE" && (
					<p className="text-sm tabular-nums">
						€{num(method.flatCost ?? "0")} per order
					</p>
				)}

				{method.type === "FREE_SHIPPING" && (
					<p className="text-sm">
						{method.freeAboveSubtotal
							? `Free above €${num(method.freeAboveSubtotal)}`
							: "Always free"}
					</p>
				)}

				{(method.type === "WEIGHT_BANDED" || method.type === "PRICE_BANDED") &&
					(method.bands.length ? (
						<div className="flex flex-wrap gap-x-6 gap-y-1">
							{method.bands.map((band, index) => (
								<span key={band.id ?? index} className="text-xs tabular-nums">
									<span className="text-muted-foreground">
										{bandRange(band.minValue, band.maxValue, unit)}
									</span>
									<span className="ml-2 font-medium">€{num(band.cost)}</span>
								</span>
							))}
						</div>
					) : (
						<p className="text-negative text-xs">
							No bands — nothing can be quoted for this method.
						</p>
					))}
			</div>
		</div>
	)
}

export const ZoneCard = ({ zone, onEdit }: { zone: ShippingZone; onEdit: () => void }) => {
	const [deleteZone] = useDeleteShippingZoneMutation()
	const [deleteMethod] = useDeleteShippingMethodMutation()

	const [methodDialog, setMethodDialog] = useState<{ open: boolean; method?: ShippingMethod }>({
		open: false,
	})
	const [pending, setPending] = useState<
		{ kind: "zone" } | { kind: "method"; method: ShippingMethod } | null
	>(null)
	const [busy, setBusy] = useState(false)

	const runDelete = async () => {
		if (!pending) return
		setBusy(true)

		try {
			if (pending.kind === "zone") {
				await deleteZone(zone.id).unwrap()
				toast.success(`“${zone.name}” deleted.`)
			} else {
				await deleteMethod(pending.method.id).unwrap()
				toast.success(`“${pending.method.name}” deleted.`)
			}
			setPending(null)
		} catch (error) {
			const message = (error as { data?: { message?: string } })?.data?.message
			toast.error(message ?? "Could not delete.")
		}

		setBusy(false)
	}

	return (
		<section className="bg-card overflow-hidden rounded-lg border">
			<header className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
				<h2 className="font-heading text-sm font-semibold">{zone.name}</h2>
				<span className="text-muted-foreground font-mono text-xs">{zone.code}</span>
				{!zone.isActive && (
					<Badge variant="outline" className="border-transparent bg-negative-soft text-negative">
						Inactive
					</Badge>
				)}

				<div className="ml-auto flex gap-1">
					<Button variant="ghost" size="icon" aria-label={`Edit ${zone.name}`} onClick={onEdit}>
						<Pencil />
					</Button>
					<Button
						variant="ghost"
						size="icon"
						className="text-muted-foreground hover:text-destructive"
						aria-label={`Delete ${zone.name}`}
						onClick={() => setPending({ kind: "zone" })}
					>
						<Trash2 />
					</Button>
				</div>
			</header>

			<div className="text-muted-foreground border-b px-4 py-2.5 text-xs">
				{zone.countries.length ? (
					<>
						<span className="font-medium">{zone.countries.length} countries: </span>
						{zone.countries.map(countryName).join(", ")}
					</>
				) : (
					<span className="text-negative">
						No countries — this zone is never matched.
					</span>
				)}
			</div>

			{zone.methods.length ? (
				<div className="divide-y">
					{zone.methods.map((method) => (
						<MethodBlock
							key={method.id}
							method={method}
							onEdit={() => setMethodDialog({ open: true, method })}
							onDelete={() => setPending({ kind: "method", method })}
						/>
					))}
				</div>
			) : (
				<p className="text-muted-foreground p-6 text-center text-sm">
					No methods. Customers in this zone are offered no shipping and cannot
					check out.
				</p>
			)}

			<div className="flex justify-end border-t px-4 py-2.5">
				<Button variant="outline" size="sm" onClick={() => setMethodDialog({ open: true })}>
					<Plus />
					Add method
				</Button>
			</div>

			{/* Mounted only while open so the form rebuilds per method — useForm
			    reads defaultValues once. */}
			{methodDialog.open && (
				<MethodDialog
					open
					onOpenChange={(open) => !open && setMethodDialog({ open: false })}
					zoneId={zone.id}
					method={methodDialog.method}
				/>
			)}

			<AlertDialog open={!!pending} onOpenChange={(open) => !open && setPending(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							{pending?.kind === "zone"
								? `Delete “${zone.name}”?`
								: `Delete “${pending?.method.name}”?`}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{pending?.kind === "zone"
								? `This removes the zone, its methods and every band. Customers in ${zone.countries.length} ${zone.countries.length === 1 ? "country" : "countries"} would be offered no shipping until another zone claims them.`
								: "Its bands go with it. If this was the zone's only method, nobody there can check out."}
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

export default ZoneCard
