"use client"

import { use } from "react"
import { Loader2 } from "lucide-react"
import { useTaxClassesQuery } from "@/redux/api/taxApi"
import TaxRateForm from "../../../../../_components/TaxRateForm"

export default function EditTaxRatePage({
	params,
}: {
	params: Promise<{ classId: string; rateId: string }>
}) {
	const { classId, rateId } = use(params)
	const { data: classes, isLoading, isError } = useTaxClassesQuery()

	if (isLoading) {
		return (
			<p className="text-muted-foreground py-24 text-center text-sm">
				<Loader2 className="mr-2 inline size-4 animate-spin" />
				Loading…
			</p>
		)
	}

	const rate = classes?.find((c) => c.id === classId)?.rates.find((r) => r.id === rateId)

	if (isError || !rate) {
		return <p className="text-destructive py-24 text-center text-sm">Could not find that rate.</p>
	}

	return <TaxRateForm taxClassId={classId} rate={rate} />
}
