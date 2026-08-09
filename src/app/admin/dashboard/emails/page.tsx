"use client"

import Link from "next/link"
import { Loader2, Lock, MailOpen, Palette, Settings2 } from "lucide-react"
import { toast } from "sonner"
import Panel from "@/components/dashboard/shell/Panel"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { useEmailTemplatesQuery, useSaveEmailTemplateMutation } from "@/redux/api/emailApi"
import type { EmailTemplate } from "@/types/email"

/**
 * Every message the shop can send.
 *
 * Grouped by who receives it, because that is the question an admin actually
 * has — "what do customers get from us" is a different review from "what am I
 * being told about". The switch is here rather than one level down so turning
 * something off does not need two page loads.
 */

const GROUPS: { audience: EmailTemplate["audience"]; title: string; blurb: string }[] = [
	{
		audience: "customer",
		title: "To customers",
		blurb: "Sent to the person who bought, registered or asked for a quote.",
	},
	{
		audience: "staff",
		title: "To you",
		blurb: "Notifications about what is happening in the shop.",
	},
]

const EmailRow = ({ template }: { template: EmailTemplate }) => {
	const [save, { isLoading }] = useSaveEmailTemplateMutation()

	const toggle = async (enabled: boolean) => {
		try {
			await save({ kind: template.key, data: { ...template.override, enabled } }).unwrap()
			toast.success(enabled ? `${template.label} is on.` : `${template.label} is off.`)
		} catch (error) {
			const message = (error as { data?: { message?: string } })?.data?.message
			toast.error(message ?? "Could not change that.")
		}
	}

	const customised =
		template.override.subject ||
		template.override.heading ||
		template.override.additionalContent ||
		template.override.recipient

	return (
		<div className="flex items-start gap-4 border-b p-4 last:border-b-0">
			<div className="min-w-0 flex-1">
				<div className="flex flex-wrap items-center gap-2">
					<Link
						href={`/admin/dashboard/emails/${template.key}`}
						className="font-medium hover:underline"
					>
						{template.label}
					</Link>
					{!!customised && (
						<Badge variant="secondary" className="font-normal">
							Edited
						</Badge>
					)}
					{!template.canDisable && (
						<Badge variant="outline" className="gap-1 font-normal">
							<Lock className="size-3" />
							Always on
						</Badge>
					)}
				</div>
				<p className="text-muted-foreground mt-1 text-sm">{template.description}</p>
			</div>

			<div className="flex shrink-0 items-center gap-3">
				<Button asChild variant="ghost" size="sm">
					<Link href={`/admin/dashboard/emails/${template.key}`}>
						<Settings2 className="size-4" />
						Edit
					</Link>
				</Button>
				<Switch
					checked={template.override.enabled}
					// Locked rather than hidden: the mail exists, and the reason it
					// cannot be switched off is worth showing.
					disabled={!template.canDisable || isLoading}
					onCheckedChange={toggle}
					aria-label={`Send ${template.label}`}
				/>
			</div>
		</div>
	)
}

export default function EmailsPage() {
	const { data, isLoading, isError } = useEmailTemplatesQuery()

	if (isLoading) {
		return (
			<p className="text-muted-foreground py-24 text-center text-sm">
				<Loader2 className="mr-2 inline size-4 animate-spin" />
				Loading emails…
			</p>
		)
	}

	if (isError || !data) {
		return <p className="text-destructive py-24 text-center text-sm">Could not load the emails.</p>
	}

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap items-end justify-between gap-3">
				<div>
					<h1 className="flex items-center gap-2 text-xl font-semibold">
						<MailOpen className="size-5" />
						Emails
					</h1>
					<p className="text-muted-foreground mt-1 text-sm">
						What the shop sends, and what each message says.
					</p>
				</div>

				<Button asChild variant="outline" size="sm">
					<Link href="/admin/dashboard/settings/email">
						<Palette className="size-4" />
						Logo &amp; colours
					</Link>
				</Button>
			</div>

			{GROUPS.map((group) => {
				const rows = data.filter((t) => t.audience === group.audience)
				if (!rows.length) return null

				return (
					<Panel
						key={group.audience}
						className="p-0"
						title={
							<div className="p-5 pb-0">
								<h2 className="font-heading text-base font-semibold">{group.title}</h2>
								<p className="text-muted-foreground mt-1 text-sm">{group.blurb}</p>
							</div>
						}
					>
						<div className="border-t">
							{rows.map((template) => (
								<EmailRow key={template.key} template={template} />
							))}
						</div>
					</Panel>
				)
			})}
		</div>
	)
}
