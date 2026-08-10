"use client"

import { useState } from "react"
import Link from "next/link"
import { Pencil, Trash2 } from "lucide-react"
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
import { useDeleteShippingMethodMutation } from "@/redux/api/shippingApi"
import type { ShippingMethod, ShippingZone } from "@/types/shipping"

/**
 * The methods inside one zone.
 *
 * Shared by the zone card on the list and the zone's own editor, so the two can
 * never drift into describing the same rates differently. Editing is a link;
 * deleting stays a confirmation, which is a question rather than a form.
 */

const TYPE_LABEL: Record<string, string> = {
	WEIGHT_BANDED: "Weight bands",
	FLAT_RATE: "Flat rate",
	FREE_SHIPPING: "Free shipping",
	PRICE_BANDED: "Order-value bands",
}

/** Trailing zeros from Decimal(12,4) read as false precision in a rate table. */
const num = (value: string) => String(Number(value))

/** "0 – 15 kg" · "320 kg and above". */
const bandRange = (min: string, max: string | null, unit: string) =>
	max === null ? `${num(min)} ${unit} and above` : `${num(min)} – ${num(max)} ${unit}`

const MethodBlock = ({
	method,
	editHref,
	onDelete,
}: {
	method: ShippingMethod
	editHref: string
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
					<Button asChild variant="ghost" size="icon">
						<Link href={editHref} aria-label={`Edit ${method.name}`}>
							<Pencil />
						</Link>
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
					<p className="text-sm tabular-nums">€{num(method.flatCost ?? "0")} per order</p>
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

export const ZoneMethods = ({ zone }: { zone: ShippingZone }) => {
	const [deleteMethod] = useDeleteShippingMethodMutation()
	const [pending, setPending] = useState<ShippingMethod | null>(null)
	const [busy, setBusy] = useState(false)

	const runDelete = async () => {
		if (!pending) return
		setBusy(true)

		try {
			await deleteMethod(pending.id).unwrap()
			toast.success(`“${pending.name}” deleted.`)
			setPending(null)
		} catch (error) {
			const message = (error as { data?: { message?: string } })?.data?.message
			toast.error(message ?? "Could not delete.")
		}

		setBusy(false)
	}

	return (
		<>
			{zone.methods.length ? (
				<div className="divide-y">
					{zone.methods.map((method) => (
						<MethodBlock
							key={method.id}
							method={method}
							editHref={`/admin/dashboard/shipping/zones/${zone.id}/methods/${method.id}/edit`}
							onDelete={() => setPending(method)}
						/>
					))}
				</div>
			) : (
				<p className="text-muted-foreground p-6 text-center text-sm">
					No methods. Customers in this zone are offered no shipping and cannot check out.
				</p>
			)}

			<AlertDialog open={!!pending} onOpenChange={(open) => !open && setPending(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete “{pending?.name}”?</AlertDialogTitle>
						<AlertDialogDescription>
							Its bands go with it. If this was the zone&rsquo;s only method, nobody there can
							check out.
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
		</>
	)
}

export default ZoneMethods
