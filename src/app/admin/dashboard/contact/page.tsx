"use client"

import { useState } from "react"
import { Check, Loader2, Mail } from "lucide-react"
import { toast } from "sonner"
import Toolbar from "@/components/dashboard/shell/Toolbar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import { useContactMessagesQuery, useMarkContactHandledMutation } from "@/redux/api/inboxApi"

const ANY = "__any__"
const PER_PAGE = 20

const formatDate = (value: string) =>
	new Date(value).toLocaleDateString("en-GB", {
		day: "2-digit",
		month: "short",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	})

export default function ContactPage() {
	const [handled, setHandled] = useState<"true" | "false" | undefined>("false")
	const [page, setPage] = useState(1)
	const [busy, setBusy] = useState<string | null>(null)

	const { data, isLoading, isFetching, isError, error } = useContactMessagesQuery({
		handled,
		page,
		limit: PER_PAGE,
	})

	const [markHandled] = useMarkContactHandledMutation()

	const messages = data?.data ?? []
	const meta = data?.meta

	const handle = async (id: string) => {
		setBusy(id)
		try {
			await markHandled({ id }).unwrap()
			toast.success("Marked as handled.")
		} catch (err) {
			const message = (err as { data?: { message?: string } })?.data?.message
			toast.error(message ?? "Could not update the message.")
		}
		setBusy(null)
	}

	return (
		<div className="space-y-4">
			<Toolbar
				filters={
					<Select
						value={handled ?? ANY}
						onValueChange={(value) => {
							setHandled(value === ANY ? undefined : (value as "true" | "false"))
							setPage(1)
						}}
					>
						<SelectTrigger className="w-44" aria-label="Filter by handled">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="false">Needs a reply</SelectItem>
							<SelectItem value="true">Handled</SelectItem>
							<SelectItem value={ANY}>Everything</SelectItem>
						</SelectContent>
					</Select>
				}
			/>

			{isLoading && (
				<div className="bg-card text-muted-foreground flex items-center justify-center gap-2 rounded-lg border p-16 text-sm">
					<Loader2 className="size-4 animate-spin" />
					Loading messages…
				</div>
			)}

			{isError && (
				<div className="text-destructive bg-card rounded-lg border border-dashed p-16 text-center text-sm">
					{(error as { data?: { message?: string } })?.data?.message ??
						"Could not load messages."}
				</div>
			)}

			{data && !messages.length && (
				<div className="bg-card rounded-lg border border-dashed p-16 text-center">
					<p className="text-muted-foreground text-sm">
						{handled === "false"
							? "Nothing waiting for a reply."
							: "No messages here."}
					</p>
				</div>
			)}

			{/*
			 * Cards, not a table. A contact message is mostly one long free-text
			 * field, which a table column either truncates into uselessness or
			 * stretches until every other column is unreadable.
			 */}
			{messages.map((message) => (
				<section key={message.id} className="bg-card overflow-hidden rounded-lg border">
					<header className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
						<div className="min-w-0">
							<h2 className="font-heading truncate text-sm font-semibold">
								{message.subject || "(no subject)"}
							</h2>
							<p className="text-muted-foreground text-xs">
								{message.name}
								{message.company && ` · ${message.company}`} ·{" "}
								<a href={`mailto:${message.email}`} className="hover:underline">
									{message.email}
								</a>
								{message.phone && ` · ${message.phone}`}
							</p>
						</div>

						<div className="ml-auto flex items-center gap-2">
							<span className="text-muted-foreground text-xs uppercase">{message.locale}</span>
							<span className="text-muted-foreground text-xs">
								{formatDate(message.createdAt)}
							</span>
							{message.handledAt ? (
								<Badge
									variant="outline"
									className="border-transparent bg-positive-soft text-positive"
								>
									Handled
								</Badge>
							) : (
								<Badge
									variant="outline"
									className="border-transparent bg-accent-soft-strong text-primary"
								>
									Needs a reply
								</Badge>
							)}
						</div>
					</header>

					<p className="px-4 py-3 text-sm whitespace-pre-line">{message.message}</p>

					<div className="flex flex-wrap items-center gap-2 border-t px-4 py-2.5">
						{message.internalNote && (
							<p className="text-muted-foreground text-xs">Note: {message.internalNote}</p>
						)}
						<div className="ml-auto flex gap-2">
							<Button asChild variant="outline" size="sm">
								<a
									href={`mailto:${message.email}?subject=${encodeURIComponent(
										message.subject ? `Re: ${message.subject}` : "Your enquiry"
									)}`}
								>
									<Mail />
									Reply by email
								</a>
							</Button>
							{!message.handledAt && (
								<Button
									size="sm"
									disabled={busy === message.id}
									onClick={() => handle(message.id)}
								>
									<Check />
									Mark handled
								</Button>
							)}
						</div>
					</div>
				</section>
			))}

			{!!meta && meta.total > 0 && (
				<div className="text-muted-foreground bg-card flex flex-wrap items-center gap-3 rounded-lg border px-4 py-2.5 text-xs">
					<span>
						{meta.total} {meta.total === 1 ? "message" : "messages"} · page {meta.page} of{" "}
						{meta.totalPages}
					</span>
					{isFetching && <Loader2 className="size-3 animate-spin" />}
					<div className="ml-auto flex gap-2">
						<Button
							variant="outline"
							size="sm"
							disabled={meta.page <= 1 || isFetching}
							onClick={() => setPage((p) => Math.max(1, p - 1))}
						>
							Previous
						</Button>
						<Button
							variant="outline"
							size="sm"
							disabled={meta.page >= meta.totalPages || isFetching}
							onClick={() => setPage((p) => p + 1)}
						>
							Next
						</Button>
					</div>
				</div>
			)}
		</div>
	)
}
