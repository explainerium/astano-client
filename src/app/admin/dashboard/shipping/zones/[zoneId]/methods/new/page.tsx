"use client"

import { use } from "react"
import { Loader2 } from "lucide-react"
import { useShippingZonesQuery } from "@/redux/api/shippingApi"
import MethodForm from "../../../../_components/MethodForm"

export default function NewMethodPage({ params }: { params: Promise<{ zoneId: string }> }) {
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

	return <MethodForm zoneId={zone.id} zoneName={zone.name} />
}
