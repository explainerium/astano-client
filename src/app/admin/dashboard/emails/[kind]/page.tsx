"use client"

import { use } from "react"
import Link from "next/link"
import { ArrowLeft, Loader2 } from "lucide-react"
import Panel from "@/components/dashboard/shell/Panel"
import { Badge } from "@/components/ui/badge"
import { useEmailTemplateQuery } from "@/redux/api/emailApi"
import EmailForm from "./_components/EmailForm"
import EmailPreview from "./_components/EmailPreview"
import TestSend from "./_components/TestSend"

/**
 * One email: what it says on the left, what it looks like on the right.
 *
 * Side by side rather than behind a tab. Editing a subject and then hunting for
 * the preview is how wording gets shipped unread — the preview refetches on
 * save, so the change is visible where the admin is already looking.
 */
export default function EmailDetailPage({ params }: { params: Promise<{ kind: string }> }) {
	const { kind } = use(params)
	const { data, isLoading, isError } = useEmailTemplateQuery(kind)

	if (isLoading) {
		return (
			<p className="text-muted-foreground py-24 text-center text-sm">
				<Loader2 className="mr-2 inline size-4 animate-spin" />
				Loading…
			</p>
		)
	}

	if (isError || !data) {
		return <p className="text-destructive py-24 text-center text-sm">Could not load that email.</p>
	}

	return (
		<div className="space-y-6">
			<div>
				<Link
					href="/admin/dashboard/emails"
					className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
				>
					<ArrowLeft className="size-4" />
					All emails
				</Link>

				<div className="mt-2 flex flex-wrap items-center gap-2">
					<h1 className="text-xl font-semibold">{data.label}</h1>
					<Badge variant={data.override.enabled ? "secondary" : "outline"} className="font-normal">
						{data.override.enabled ? "On" : "Off"}
					</Badge>
					<Badge variant="outline" className="font-normal">
						{data.audience === "staff" ? "To you" : "To customers"}
					</Badge>
				</div>

				<p className="text-muted-foreground mt-1 text-sm">{data.description}</p>
			</div>

			<div className="grid gap-6 xl:grid-cols-2">
				<div className="space-y-6">
					<Panel title="Wording">
						<EmailForm template={data} />
					</Panel>

					<Panel title="Send a test">
						<TestSend kind={kind} />
					</Panel>
				</div>

				<Panel title="Preview" className="xl:sticky xl:top-6 xl:self-start">
					<EmailPreview kind={kind} />
				</Panel>
			</div>
		</div>
	)
}
