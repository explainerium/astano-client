"use client"

import { useTranslations } from "next-intl"
import { use } from "react"
import { Loader2 } from "lucide-react"
import { useAdminAttributesQuery } from "@/redux/api/attributeApi"
import AttributeForm from "../../_components/AttributeForm"

/**
 * Picked out of the list rather than fetched on its own.
 *
 * There are a handful of attributes and the list endpoint returns all of them
 * with their values attached, so a by-id endpoint would be a second way to load
 * the same rows. It still works on a cold URL load — the list is fetched here,
 * not inherited from the page behind.
 */
export default function EditAttributePage({ params }: { params: Promise<{ id: string }> }) {
	const t = useTranslations("admin")
	const { id } = use(params)
	const { data: attributes, isLoading, isError } = useAdminAttributesQuery()

	if (isLoading) {
		return (
			<p className="text-muted-foreground py-24 text-center text-sm">
				<Loader2 className="mr-2 inline size-4 animate-spin" />{t("loading")}</p>
		)
	}

	const attribute = attributes?.find((a) => a.id === id)

	if (isError || !attribute) {
		return (
			<p className="text-destructive py-24 text-center text-sm">{t("couldNotFindThatAttribute")}</p>
		)
	}

	return <AttributeForm attribute={attribute} />
}
