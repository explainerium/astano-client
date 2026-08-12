"use client"

import { useLocale, useTranslations } from "next-intl"
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

/**
 * The subject offered when a message arrived without one.
 *
 * In the customer's language, not the dashboard's — they are the one who reads
 * it in their inbox.
 */
const ENQUIRY_SUBJECT: Record<string, string> = {
	de: "Ihre Anfrage",
	en: "Your enquiry",
}

const formatDate = (value: string, locale = "de") =>
	new Date(value).toLocaleDateString(locale, {
		day: "2-digit",
		month: "short",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	})

export default function ContactPage() {
	const t = useTranslations("admin")
	const locale = useLocale()
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
			toast.success(t("markedAsHandled"))
		} catch (err) {
			const message = (err as { data?: { message?: string } })?.data?.message
			toast.error(message ?? t("couldNotUpdateTheMessage"))
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
						<SelectTrigger className="w-44" aria-label={t("filterByHandled")}>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="false">{t("needsAReply")}</SelectItem>
							<SelectItem value="true">{t("handled")}</SelectItem>
							<SelectItem value={ANY}>{t("everything")}</SelectItem>
						</SelectContent>
					</Select>
				}
			/>

			{isLoading && (
				<div className="bg-card text-muted-foreground flex items-center justify-center gap-2 rounded-lg border p-16 text-sm">
					<Loader2 className="size-4 animate-spin" />{t("loadingMessages")}</div>
			)}

			{isError && (
				<div className="text-destructive bg-card rounded-lg border border-dashed p-16 text-center text-sm">
					{(error as { data?: { message?: string } })?.data?.message ??
						t("couldNotLoadMessages")}
				</div>
			)}

			{data && !messages.length && (
				<div className="bg-card rounded-lg border border-dashed p-16 text-center">
					<p className="text-muted-foreground text-sm">
						{handled === "false"
							? t("nothingWaitingForAReply")
							: t("noMessagesHere")}
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
								{message.subject || t("noSubject")}
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
								{formatDate(message.createdAt, locale)}
							</span>
							{message.handledAt ? (
								<Badge
									variant="outline"
									className="border-transparent bg-positive-soft text-positive"
								>{t("handled")}</Badge>
							) : (
								<Badge
									variant="outline"
									className="border-transparent bg-accent-soft-strong text-primary"
								>{t("needsAReply")}</Badge>
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
										message.subject
											? `Re: ${message.subject}`
											: (ENQUIRY_SUBJECT[message.locale] ?? ENQUIRY_SUBJECT.de)
									)}`}
								>
									<Mail />{t("replyByEmail")}</a>
							</Button>
							{!message.handledAt && (
								<Button
									size="sm"
									disabled={busy === message.id}
									onClick={() => handle(message.id)}
								>
									<Check />{t("markHandled")}</Button>
							)}
						</div>
					</div>
				</section>
			))}

			{!!meta && meta.total > 0 && (
				<div className="text-muted-foreground bg-card flex flex-wrap items-center gap-3 rounded-lg border px-4 py-2.5 text-xs">
					<span>
						{t("paginationMessages", { count: meta.total, page: meta.page, pages: meta.totalPages })}
					</span>
					{isFetching && <Loader2 className="size-3 animate-spin" />}
					<div className="ml-auto flex gap-2">
						<Button
							variant="outline"
							size="sm"
							disabled={meta.page <= 1 || isFetching}
							onClick={() => setPage((p) => Math.max(1, p - 1))}
						>{t("previous")}</Button>
						<Button
							variant="outline"
							size="sm"
							disabled={meta.page >= meta.totalPages || isFetching}
							onClick={() => setPage((p) => p + 1)}
						>{t("next")}</Button>
					</div>
				</div>
			)}
		</div>
	)
}
