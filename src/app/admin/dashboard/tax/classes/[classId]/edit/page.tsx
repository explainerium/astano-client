"use client"

import { useTranslations } from "next-intl"
import { use } from "react"
import { Loader2 } from "lucide-react"
import { useTaxClassesQuery } from "@/redux/api/taxApi"
import TaxClassForm from "../../../_components/TaxClassForm"

export default function EditTaxClassPage({ params }: { params: Promise<{ classId: string }> }) {
	const t = useTranslations("admin")
	const { classId } = use(params)
	const { data: classes, isLoading, isError } = useTaxClassesQuery()

	if (isLoading) {
		return (
			<p className="text-muted-foreground py-24 text-center text-sm">
				<Loader2 className="mr-2 inline size-4 animate-spin" />{t("loading")}</p>
		)
	}

	const taxClass = classes?.find((c) => c.id === classId)

	if (isError || !taxClass) {
		return <p className="text-destructive py-24 text-center text-sm">{t("couldNotFindThatClass")}</p>
	}

	return <TaxClassForm taxClass={taxClass} />
}
