"use client"

import { useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { AlertCircle, Loader2, Send } from "lucide-react"
import { Link } from "@/i18n/navigation"
import { useMyQuoteQuery, useReplyToQuoteMutation } from "@/redux/api/storefrontApi"
import { formatDate, formatDateTime } from "@/lib/dates"
import { formatMoney } from "@/lib/money"
import { cn } from "@/lib/utils"
import StatusChip from "../../../_components/StatusChip"
import AcceptQuote from "./AcceptQuote"

const apiMessage = (error: unknown) => (error as { data?: { message?: string } })?.data?.message

export const QuoteDetail = ({ id }: { id: string }) => {
	const t = useTranslations("account")
	const locale = useLocale()

	const { data: quote, isLoading, isError } = useMyQuoteQuery(id)
	const [replyToQuote, { isLoading: isSending }] = useReplyToQuoteMutation()

	const [draft, setDraft] = useState("")
	const [error, setError] = useState<string | null>(null)

	if (isLoading) {
		return (
			<p className="text-muted-foreground py-16 text-center text-sm">
				<Loader2 className="mr-2 inline size-4 animate-spin" />…
			</p>
		)
	}

	if (isError || !quote) {
		return (
			<div className="py-16 text-center">
				<p className="text-muted-foreground text-sm">{t("noQuotes")}</p>
				<Link
					href="/account/quotes"
					className="text-primary mt-4 inline-block underline underline-offset-2"
				>
					{t("quotesTitle")}
				</Link>
			</div>
		)
	}

	const sendReply = async () => {
		if (!draft.trim()) return
		setError(null)
		try {
			await replyToQuote({ id, body: draft.trim() }).unwrap()
			setDraft("")
		} catch (caught) {
			setError(apiMessage(caught) ?? t("replyFailed"))
		}
	}

	// Only an answered quote can be turned into an order, and only while it is
	// still valid — the server enforces both; this decides whether to ask.
	const canAccept = quote.status === "ANSWERED" && Boolean(quote.quotedSubtotal)

	return (
		<div className="space-y-10">
			<div className="flex flex-wrap items-center gap-4">
				<h2 className="font-heading text-2xl font-extrabold tracking-tight">
					{quote.quoteNumber}
				</h2>
				<StatusChip status={quote.status} kind="quoteStatus" />
				<span className="text-muted-foreground text-sm">
					{formatDate(quote.submittedAt, locale)}
				</span>
			</div>

			<section>
				<h3 className="font-heading mb-1 text-lg font-semibold">{quote.title}</h3>
				{quote.message && (
					<p className="text-muted-foreground text-sm leading-relaxed">{quote.message}</p>
				)}
			</section>

			<section>
				<h3 className="font-heading mb-4 text-lg font-semibold">{t("orderItems")}</h3>
				<ul className="divide-y border-y">
					{quote.items.map((item) => (
						<li key={item.id} className="flex gap-4 py-4">
							<div className="min-w-0 flex-1">
								<p className="font-medium">{item.name}</p>
								{item.sku && <p className="text-muted-foreground text-xs">{item.sku}</p>}
								<p className="text-muted-foreground mt-1 text-sm">{item.quantity} ×</p>
								{item.note && (
									<p className="text-muted-foreground mt-1 text-xs italic">{item.note}</p>
								)}
							</div>
							<span className="shrink-0 text-right text-sm">
								{item.quotedLineTotal ? (
									<>
										<span className="font-semibold">
											{formatMoney(item.quotedLineTotal)}
										</span>
										<span className="text-muted-foreground block text-xs">
											{formatMoney(item.quotedUnitPrice)}
										</span>
									</>
								) : (
									<span className="text-muted-foreground italic">{t("awaitingPrice")}</span>
								)}
							</span>
						</li>
					))}
				</ul>

				{quote.quotedSubtotal && (
					<div className="mt-4 flex justify-end gap-4 text-sm">
						<span className="font-heading font-semibold">{t("quotedTotal")}</span>
						<span className="text-lg font-bold">
							{formatMoney(quote.quotedSubtotal)}
						</span>
					</div>
				)}

				{quote.expiresAt && (
					<p className="text-muted-foreground mt-2 text-right text-xs">
						{t("validUntil")}: {formatDate(quote.expiresAt, locale)}
					</p>
				)}
			</section>

			{canAccept && <AcceptQuote quoteId={quote.id} total={quote.quotedSubtotal!} />}

			<section>
				<h3 className="font-heading mb-4 text-lg font-semibold">{t("conversation")}</h3>

				<ul className="space-y-4">
					{quote.messages.map((message) => (
						<li
							key={message.id}
							className={cn(
								"max-w-[85%] p-4 text-sm leading-relaxed",
								message.author === "CUSTOMER" ? "bg-primary/10 ml-auto" : "bg-muted"
							)}
						>
							<p className="mb-1 text-xs font-semibold">
								{message.author === "CUSTOMER" ? t("you") : t("staff")}
								<span className="text-muted-foreground ml-2 font-normal">
									{formatDateTime(message.createdAt, locale)}
								</span>
							</p>
							<p className="whitespace-pre-wrap">{message.body}</p>
						</li>
					))}
				</ul>

				<div className="mt-6">
					<label htmlFor="quote-reply" className="sr-only">
						{t("writeReply")}
					</label>
					<textarea
						id="quote-reply"
						rows={3}
						value={draft}
						onChange={(event) => setDraft(event.target.value)}
						placeholder={t("writeReply")}
						className="focus:border-primary w-full border px-3 py-2.5 text-sm outline-none"
					/>
					{error && (
						<p className="text-destructive mt-2 flex items-center gap-2 text-sm" role="alert">
							<AlertCircle className="size-4 shrink-0" />
							{error}
						</p>
					)}
					<button
						type="button"
						onClick={sendReply}
						disabled={isSending || !draft.trim()}
						className="bg-primary text-primary-foreground mt-3 inline-flex items-center gap-2 px-6 py-2.5 text-sm font-semibold tracking-wide uppercase transition-opacity hover:opacity-90 disabled:opacity-50"
					>
						{isSending ? (
							<Loader2 className="size-4 animate-spin" />
						) : (
							<Send className="size-4" />
						)}
						{t("sendReply")}
					</button>
				</div>
			</section>
		</div>
	)
}

export default QuoteDetail
