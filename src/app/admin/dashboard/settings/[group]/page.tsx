"use client"

import { useTranslations } from "next-intl"
import { useParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import { useSettingsQuery } from "@/redux/api/settingApi"
import SettingsGroupForm from "../_components/SettingsGroupForm"
import useSettingText from "../_components/useSettingText"
import TierPriorityCard from "../_components/TierPriorityCard"

/**
 * One settings section.
 *
 * The group is a URL segment rather than a tab in local state, so a section can
 * be linked to and the back button steps through them.
 */
export default function SettingsGroupPage() {
	const t = useTranslations("admin")
	const { group } = useParams<{ group: string }>()
	const c = useTranslations("adminCommon")
	const text = useSettingText()
	const { data, isLoading, isError, error } = useSettingsQuery()

	if (isLoading) {
		return (
			<div className="bg-card text-muted-foreground flex items-center justify-center gap-2 rounded-lg border p-16 text-sm">
				<Loader2 className="size-4 animate-spin" />{t("loadingSettings")}</div>
		)
	}

	if (isError || !data) {
		return (
			<div className="text-destructive bg-card rounded-lg border border-dashed p-16 text-center text-sm">
				{(error as { data?: { message?: string } })?.data?.message ??
					c("loadFailed")}
			</div>
		)
	}

	const definition = data.groups.find((entry) => entry.key === group)

	if (!definition) {
		return (
			<div className="bg-card rounded-lg border border-dashed p-16 text-center text-sm">
				<p className="text-muted-foreground">{t("thatSettingsSectionDoesNotExist")}</p>
			</div>
		)
	}

	return (
		<div className="space-y-4">
			<div>
				<h2 className="font-heading text-base font-semibold">{text.groupTitle(group, definition.title)}</h2>
				{definition.blurb && (
					<p className="text-muted-foreground mt-1 max-w-prose text-sm">{text.groupBlurb(group, definition.blurb)}</p>
				)}
			</div>

			<SettingsGroupForm data={data} groupKey={group} />

			{/* The ladder priority has a control of its own — three named sources with
			    an explanation each, rather than a comma-separated string to type. */}
			{group === "pricing" && <TierPriorityCard />}
		</div>
	)
}
