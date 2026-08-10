"use client"

import { use } from "react"
import Link from "next/link"
import { Loader2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useShippingZonesQuery } from "@/redux/api/shippingApi"
import ZoneForm from "../../../_components/ZoneForm"
import ZoneMethods from "../../../_components/ZoneMethods"

/**
 * A zone and the methods inside it.
 *
 * Both on one page because the two are not independent: a zone with no methods
 * offers no shipping and nobody in those countries can check out. Splitting
 * them would let an admin finish the zone form, see a success message, and
 * leave without ever being shown that half.
 */
export default function EditZonePage({ params }: { params: Promise<{ zoneId: string }> }) {
	const { zoneId } = use(params)
	const { data: zones, isLoading, isError } = useShippingZonesQuery()

	if (isLoading) {
		return (
			<p className="text-muted-foreground py-24 text-center text-sm">
				<Loader2 className="mr-2 inline size-4 animate-spin" />
				Loading…
			</p>
		)
	}

	const zone = zones?.find((z) => z.id === zoneId)

	if (isError || !zone) {
		return <p className="text-destructive py-24 text-center text-sm">Could not find that zone.</p>
	}

	return (
		<div className="space-y-6">
			<ZoneForm zone={zone} />

			<div className="bg-card rounded-lg border">
				<header className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
					<div>
						<h2 className="font-heading text-base font-semibold">Methods</h2>
						<p className="text-muted-foreground mt-1 text-sm">
							What customers in this zone are offered at checkout.
						</p>
					</div>
					<Button asChild variant="outline" size="sm">
						<Link href={`/admin/dashboard/shipping/zones/${zone.id}/methods/new`}>
							<Plus />
							Add method
						</Link>
					</Button>
				</header>

				<ZoneMethods zone={zone} />
			</div>
		</div>
	)
}
