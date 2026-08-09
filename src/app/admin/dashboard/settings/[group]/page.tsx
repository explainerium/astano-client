"use client"

import { useParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import { useSettingsQuery } from "@/redux/api/settingApi"
import SettingsGroupForm from "../_components/SettingsGroupForm"
import TierPriorityCard from "../_components/TierPriorityCard"

/**
 * One settings section.
 *
 * The group is a URL segment rather than a tab in local state, so a section can
 * be linked to and the back button steps through them.
 */
export default function SettingsGroupPage() {
	const { group } = useParams<{ group: string }>()
	const { data, isLoading, isError, error } = useSettingsQuery()

	if (isLoading) {
		return (
			<div className="bg-card text-muted-foreground flex items-center justify-center gap-2 rounded-lg border p-16 text-sm">
				<Loader2 className="size-4 animate-spin" />
				Loading settings…
			</div>
		)
	}

	if (isError || !data) {
		return (
			<div className="text-destructive bg-card rounded-lg border border-dashed p-16 text-center text-sm">
				{(error as { data?: { message?: string } })?.data?.message ??
					"Could not load the settings."}
			</div>
		)
	}

	const definition = data.groups.find((entry) => entry.key === group)

	if (!definition) {
		return (
			<div className="bg-card rounded-lg border border-dashed p-16 text-center text-sm">
				<p className="text-muted-foreground">That settings section does not exist.</p>
			</div>
		)
	}

	return (
		<div className="space-y-4">
			<div>
				<h2 className="font-heading text-base font-semibold">{definition.title}</h2>
				{definition.blurb && (
					<p className="text-muted-foreground mt-1 max-w-prose text-sm">{definition.blurb}</p>
				)}
			</div>

			<SettingsGroupForm data={data} groupKey={group} />

			{/* The ladder priority has a control of its own — three named sources with
			    an explanation each, rather than a comma-separated string to type. */}
			{group === "pricing" && <TierPriorityCard />}
		</div>
	)
}
