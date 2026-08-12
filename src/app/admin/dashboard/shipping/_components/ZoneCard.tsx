"use client"

import { useTranslations } from "next-intl"
import { useState } from "react"
import Link from "next/link"
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
import { useDeleteShippingZoneMutation } from "@/redux/api/shippingApi"
import type { ShippingZone } from "@/types/shipping"
import ZoneMethods from "./ZoneMethods"

/**
 * One zone on the shipping list: who it covers and what it charges them.
 *
 * Read-and-navigate. Editing the zone or any of its methods is a page of its
 * own; what stays here is deleting, which is a confirmation rather than a form.
 */

const regionNames = new Intl.DisplayNames(["en"], { type: "region" })

const countryName = (code: string) => {
	try {
		return regionNames.of(code) ?? code
	} catch {
		return code
	}
}

export const ZoneCard = ({ zone }: { zone: ShippingZone }) => {
	const t = useTranslations("admin")
	const [deleteZone] = useDeleteShippingZoneMutation()
	const [confirming, setConfirming] = useState(false)
	const [busy, setBusy] = useState(false)

	const runDelete = async () => {
		setBusy(true)

		try {
			await deleteZone(zone.id).unwrap()
			toast.success(`“${zone.name}” deleted.`)
			setConfirming(false)
		} catch (error) {
			const message = (error as { data?: { message?: string } })?.data?.message
			toast.error(message ?? "Could not delete.")
		}

		setBusy(false)
	}

	const zoneHref = `/admin/dashboard/shipping/zones/${zone.id}/edit`

	return (
		<section className="bg-card overflow-hidden rounded-lg border">
			<header className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
				<h2 className="font-heading text-sm font-semibold">
					<Link href={zoneHref} className="hover:underline">
						{zone.name}
					</Link>
				</h2>
				<span className="text-muted-foreground font-mono text-xs">{zone.code}</span>
				{!zone.isActive && (
					<Badge variant="outline" className="border-transparent bg-negative-soft text-negative">{t("inactive")}</Badge>
				)}

				<div className="ml-auto flex gap-1">
					<Button asChild variant="ghost" size="icon">
						<Link href={zoneHref} aria-label={`Edit ${zone.name}`}>
							<Pencil />
						</Link>
					</Button>
					<Button
						variant="ghost"
						size="icon"
						className="text-muted-foreground hover:text-destructive"
						aria-label={`Delete ${zone.name}`}
						onClick={() => setConfirming(true)}
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
					<span className="text-negative">No countries — this zone is never matched.</span>
				)}
			</div>

			<ZoneMethods zone={zone} />

			<div className="flex justify-end border-t px-4 py-2.5">
				<Button asChild variant="outline" size="sm">
					<Link href={`/admin/dashboard/shipping/zones/${zone.id}/methods/new`}>
						<Plus />{t("addMethod")}</Link>
				</Button>
			</div>

			<AlertDialog open={confirming} onOpenChange={(open) => !open && setConfirming(false)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete “{zone.name}”?</AlertDialogTitle>
						<AlertDialogDescription>
							{t("deleteZoneWarning", { count: zone.countries.length })}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={busy}>{t("cancel")}</AlertDialogCancel>
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
