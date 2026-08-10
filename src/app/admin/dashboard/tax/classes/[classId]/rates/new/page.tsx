"use client"

import { use } from "react"
import TaxRateForm from "../../../../_components/TaxRateForm"

export default function NewTaxRatePage({ params }: { params: Promise<{ classId: string }> }) {
	const { classId } = use(params)
	return <TaxRateForm taxClassId={classId} />
}
