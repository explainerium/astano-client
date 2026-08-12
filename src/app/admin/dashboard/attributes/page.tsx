"use client"

import { useTranslations } from "next-intl"
import { Loader2 } from "lucide-react"
import { useAdminAttributesQuery } from "@/redux/api/attributeApi"
import AttributeTable from "./_components/AttributeTable"

export default function AttributesPage() {
	const t = useTranslations("admin")
	const { data: attributes, isLoading, isError, error } = useAdminAttributesQuery()

	return (
		<div className="space-y-4">
			{isLoading && (
				<div className="bg-card text-muted-foreground flex items-center justify-center gap-2 rounded-lg border p-16 text-sm">
					<Loader2 className="size-4 animate-spin" />{t("loadingAttributes")}</div>
			)}

			{isError && (
				<div className="text-destructive bg-card rounded-lg border border-dashed p-16 text-center text-sm">
					{(error as { data?: { message?: string } })?.data?.message ??
						"Could not load attributes."}
				</div>
			)}

			{attributes && <AttributeTable attributes={attributes} />}
		</div>
	)
}
