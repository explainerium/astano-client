"use client"

import { useState } from "react"
import Link from "next/link"
import { Loader2, Plus, Wand2 } from "lucide-react"
import { toast } from "sonner"
import Toolbar from "@/components/dashboard/shell/Toolbar"
import { Button } from "@/components/ui/button"
import {
	useCreateShippingMethodMutation,
	useCreateShippingZoneMutation,
	useShippingZonesQuery,
} from "@/redux/api/shippingApi"
import ZoneCard from "./_components/ZoneCard"
import { LIVE_MATRIX, MATRIX_BAND_COUNT } from "./_components/liveMatrix"

export default function ShippingPage() {
	const { data: zones, isLoading, isError, error } = useShippingZonesQuery()
	const [createZone] = useCreateShippingZoneMutation()
	const [createMethod] = useCreateShippingMethodMutation()

	const [seeding, setSeeding] = useState(false)

	/**
	 * Builds the five zones from §3.6 in one action.
	 *
	 * Five zones, five methods and 48 bands is an hour of typing, and a place
	 * where one wrong figure goes unnoticed until a customer is undercharged for
	 * a 300 kg pallet. Existing zone codes are skipped, so it is safe to press
	 * when some already exist.
	 */
	const seedLiveMatrix = async () => {
		setSeeding(true)
		const existing = new Set((zones ?? []).map((z) => z.code))
		let added = 0

		// Sequential: a zone must exist before its method can reference it, and a
		// failure part-way should name the zone it stopped on.
		for (const [index, zone] of LIVE_MATRIX.entries()) {
			if (existing.has(zone.code)) continue

			try {
				const created = await createZone({
					code: zone.code,
					sortOrder: index,
					isActive: true,
					countries: zone.countries,
					translations: [
						{ locale: "en", name: zone.name.en },
						{ locale: "de", name: zone.name.de },
					],
				}).unwrap()

				await createMethod({
					zoneId: created.id,
					code: zone.method.code,
					type: "WEIGHT_BANDED",
					taxable: zone.method.taxable,
					isActive: true,
					sortOrder: 0,
					translations: [
						{
							locale: "en",
							name: zone.method.name.en,
							...(zone.method.description.en
								? { description: zone.method.description.en }
								: {}),
						},
						{
							locale: "de",
							name: zone.method.name.de,
							...(zone.method.description.de
								? { description: zone.method.description.de }
								: {}),
						},
					],
					bands: zone.bands.map(([min, max, cost]) => ({
						minValue: String(min),
						maxValue: max === null ? null : String(max),
						cost,
					})),
				}).unwrap()

				added++
			} catch (err) {
				// A country already claimed by another zone is the likely cause.
				const message = (err as { data?: { message?: string } })?.data?.message
				toast.error(`${zone.name.en} — ${message ?? "could not be created"}`)
				break
			}
		}

		setSeeding(false)
		if (added) toast.success(`${added} ${added === 1 ? "zone" : "zones"} created.`)
		else toast.info("Every zone in the live matrix already exists.")
	}

	return (
		<div className="space-y-4">
			<Toolbar
				primaryAction={
					<div className="flex gap-2">
						{zones && zones.length > 0 && (
							<Button variant="outline" size="lg" disabled={seeding} onClick={seedLiveMatrix}>
								<Wand2 />
								Fill gaps from the live matrix
							</Button>
						)}
						<Button asChild size="lg">
							<Link href="/admin/dashboard/shipping/zones/new">
								<Plus />
								New zone
							</Link>
						</Button>
					</div>
				}
			/>

			{isLoading && (
				<div className="bg-card text-muted-foreground flex items-center justify-center gap-2 rounded-lg border p-16 text-sm">
					<Loader2 className="size-4 animate-spin" />
					Loading shipping zones…
				</div>
			)}

			{isError && (
				<div className="text-destructive bg-card rounded-lg border border-dashed p-16 text-center text-sm">
					{(error as { data?: { message?: string } })?.data?.message ??
						"Could not load shipping zones."}
				</div>
			)}

			{zones?.length === 0 && (
				<div className="bg-card space-y-4 rounded-lg border border-dashed p-16 text-center">
					<div className="space-y-1">
						<p className="text-sm font-medium">No shipping zones yet.</p>
						<p className="text-muted-foreground mx-auto max-w-prose text-sm">
							Nobody can check out until a zone claims their country and offers at
							least one method. The live site&rsquo;s arrangement is{" "}
							{LIVE_MATRIX.length} zones and {MATRIX_BAND_COUNT} weight bands — that
							can be built for you.
						</p>
					</div>
					<div className="flex flex-wrap justify-center gap-2">
						<Button asChild variant="outline">
							<Link href="/admin/dashboard/shipping/zones/new">
								<Plus />
								New zone
							</Link>
						</Button>
						<Button disabled={seeding} onClick={seedLiveMatrix}>
							<Wand2 />
							{seeding ? "Building…" : "Build the live matrix"}
						</Button>
					</div>
				</div>
			)}

			{zones?.map((zone) => (
				<ZoneCard key={zone.id} zone={zone} />
			))}
		</div>
	)
}
