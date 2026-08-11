"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowLeft, Loader2, Lock, Send } from "lucide-react"
import { toast } from "sonner"
import { z } from "zod"
import ProCheckbox from "@/components/form/ProCheckbox"
import ProForm from "@/components/form/ProForm"
import ArtworkLinks from "@/components/shared/ArtworkLinks"
import ProInput from "@/components/form/ProInput"
import ProSelect from "@/components/form/ProSelect"
import ProSubmit from "@/components/form/ProSubmit"
import ProTextarea from "@/components/form/ProTextarea"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table"
import { useAdminQuoteQuery, useReplyToQuoteMutation, useUpdateQuoteMutation } from "@/redux/api/quoteApi"
import type { Quote, QuoteStatus } from "@/types/quote"
import {
	formatDate,
	isFullyPriced,
	QUOTE_STATUS,
	QUOTE_STATUS_OPTIONS,
} from "../_components/quoteStatus"
import useMoney from "@/lib/useMoney"
const money = z
	.string()
	.trim()
	.refine((v) => v === "" || /^\d+(\.\d{1,4})?$/.test(v), { message: "Use a number like 12.50" })

/** Pricing the lines. Empty clears a price rather than sending zero. */
const PricingForm = ({ quote }: { quote: Quote }) => {
	// Its own, rather than threaded from the parent — it is a component, and
	// the query behind this is shared.
	const formatMoney = useMoney()

	const [updateQuote] = useUpdateQuoteMutation()

	const schema = z.object({
		status: z.enum(["OPEN", "ANSWERED", "ACCEPTED", "DECLINED", "EXPIRED", "CLOSED"]),
		items: z.array(z.object({ id: z.string(), price: money })),
	})

	type FormValues = z.infer<typeof schema>

	const onSubmit = async (form: FormValues) => {
		try {
			await updateQuote({
				id: quote.id,
				data: {
					status: form.status as QuoteStatus,
					items: form.items.map((item) => ({
						id: item.id,
						quotedUnitPrice: item.price.trim() || null,
					})),
				},
			}).unwrap()
			toast.success("Quote updated.")
		} catch (error) {
			const message = (error as { data?: { message?: string } })?.data?.message
			toast.error(message ?? "Could not update the quote.")
		}
	}

	return (
		<ProForm
			onSubmit={onSubmit}
			resolver={zodResolver(schema)}
			defaultValues={{
				status: quote.status,
				items: quote.items.map((item) => ({
					id: item.id,
					price: item.quotedUnitPrice ? String(Number(item.quotedUnitPrice)) : "",
				})),
			}}
		>
			<div className="overflow-x-auto">
				<Table>
					<TableHeader className="bg-muted/50">
						<TableRow className="hover:bg-transparent">
							{["Product", "SKU", "Qty", "MOQ", "Unit price", "Line total"].map((head) => (
								<TableHead
									key={head}
									className="text-muted-foreground text-xs font-medium tracking-wide uppercase"
								>
									{head}
								</TableHead>
							))}
						</TableRow>
					</TableHeader>
					<TableBody>
						{quote.items.map((item, index) => (
							<TableRow key={item.id}>
								<TableCell>
									<span className="font-medium">{item.name}</span>
									{item.note && (
										<p className="text-muted-foreground mt-0.5 text-xs">{item.note}</p>
									)}
									{!!item.files.length && (
										<div className="mt-1.5">
											<ArtworkLinks
												files={item.files}
												labels={{ download: "Download", deleted: "No longer available" }}
											/>
										</div>
									)}
								</TableCell>
								<TableCell className="text-muted-foreground font-mono text-xs">
									{item.sku}
								</TableCell>
								<TableCell className="tabular-nums">{item.quantity}</TableCell>
								<TableCell className="text-muted-foreground tabular-nums text-xs">
									{/* The MOQ as it stood when they submitted, not today's — the
									    quote was made against that number. */}
									{item.moq || "—"}
								</TableCell>
								<TableCell className="w-32">
									<ProInput name={`items.${index}.price`} placeholder="—" />
								</TableCell>
								<TableCell className="tabular-nums">
									{item.quotedLineTotal ? (
										formatMoney(item.quotedLineTotal)
									) : (
										<span className="text-muted-foreground text-xs">—</span>
									)}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>

			<div className="flex flex-wrap items-end justify-between gap-4 border-t p-4">
				<div className="flex items-end gap-4">
					<ProSelect
						name="status"
						label="Status"
						options={QUOTE_STATUS_OPTIONS}
						className="w-44"
					/>
					{quote.quotedSubtotal && (
						<p className="pb-2 text-sm">
							<span className="text-muted-foreground">Quoted subtotal </span>
							<span className="font-semibold tabular-nums">
								{formatMoney(quote.quotedSubtotal)}
							</span>
						</p>
					)}
				</div>
				<ProSubmit>Save prices</ProSubmit>
			</div>
		</ProForm>
	)
}

const ReplyForm = ({ quote }: { quote: Quote }) => {
	const [reply] = useReplyToQuoteMutation()

	const schema = z.object({
		body: z.string().trim().min(1, "Write something first").max(10000),
		isInternal: z.boolean(),
	})

	type FormValues = z.infer<typeof schema>

	const onSubmit = async (form: FormValues) => {
		try {
			await reply({
				id: quote.id,
				data: { body: form.body.trim(), isInternal: form.isInternal },
			}).unwrap()
			toast.success(form.isInternal ? "Note added." : "Reply sent.")
		} catch (error) {
			const message = (error as { data?: { message?: string } })?.data?.message
			toast.error(message ?? "Could not send the reply.")
		}
	}

	return (
		<ProForm
			onSubmit={onSubmit}
			resolver={zodResolver(schema)}
			defaultValues={{ body: "", isInternal: false }}
			resetOnSubmit
			className="space-y-3 p-4"
		>
			<ProTextarea name="body" label="Reply" />
			<div className="flex flex-wrap items-center justify-between gap-3">
				<ProCheckbox
					name="isInternal"
					label="Internal note"
					description="Kept on the thread for staff. The customer never sees it and no email goes out."
				/>
				<ProSubmit>
					<Send />
					Send
				</ProSubmit>
			</div>
		</ProForm>
	)
}

export default function QuoteDetailPage() {
	const router = useRouter()
	const params = useParams<{ id: string }>()
	const { data: quote, isLoading, isError, error } = useAdminQuoteQuery(params.id)
	const [showInternal, setShowInternal] = useState(true)

	if (isLoading) {
		return (
			<div className="bg-card text-muted-foreground flex items-center justify-center gap-2 rounded-lg border p-16 text-sm">
				<Loader2 className="size-4 animate-spin" />
				Loading quote…
			</div>
		)
	}

	if (isError || !quote) {
		return (
			<div className="text-destructive bg-card rounded-lg border border-dashed p-16 text-center text-sm">
				{(error as { data?: { message?: string } })?.data?.message ?? "Could not load the quote."}
			</div>
		)
	}

	const chip = QUOTE_STATUS[quote.status]
	const priced = isFullyPriced(quote.items)
	const messages = quote.messages.filter((m) => showInternal || !m.isInternal)

	return (
		<div className="space-y-5">
			<div className="bg-background sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b py-3">
				<Button
					type="button"
					variant="ghost"
					size="lg"
					onClick={() => router.push("/admin/dashboard/quotes")}
				>
					<ArrowLeft />
					Quotes
				</Button>
				<h1 className="font-heading text-sm font-semibold">{quote.quoteNumber}</h1>
				<Badge variant="outline" className={chip.className}>
					{chip.label}
				</Badge>
				{!priced && quote.status === "OPEN" && (
					<span className="text-muted-foreground text-xs">
						Not every line has a price yet
					</span>
				)}
			</div>

			<div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
				<div className="min-w-0 space-y-5">
					<section className="bg-card overflow-hidden rounded-lg border">
						<div className="border-b px-4 py-3">
							<h2 className="font-heading text-sm font-semibold">{quote.title}</h2>
							{quote.message && (
								<p className="text-muted-foreground mt-1 text-sm">{quote.message}</p>
							)}
						</div>
						<PricingForm quote={quote} />
					</section>

					<section className="bg-card overflow-hidden rounded-lg border">
						<div className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
							<h2 className="font-heading text-sm font-semibold">Thread</h2>
							<Button
								variant="ghost"
								size="sm"
								className="ml-auto"
								onClick={() => setShowInternal((v) => !v)}
							>
								{showInternal ? "Hide internal notes" : "Show internal notes"}
							</Button>
						</div>

						{!messages.length ? (
							<p className="text-muted-foreground p-6 text-center text-sm">
								Nothing on the thread yet.
							</p>
						) : (
							<ol className="divide-y">
								{messages.map((message) => (
									<li
										key={message.id}
										className={message.isInternal ? "bg-accent-soft/40 px-4 py-3" : "px-4 py-3"}
									>
										<div className="flex flex-wrap items-center gap-2 text-xs">
											<span className="font-medium">
												{message.author === "CUSTOMER" ? "Customer" : "Staff"}
											</span>
											{message.isInternal && (
												<Badge variant="outline" className="text-muted-foreground gap-1">
													<Lock className="size-3" />
													Internal
												</Badge>
											)}
											<span className="text-muted-foreground ml-auto">
												{formatDate(message.createdAt)}
											</span>
										</div>
										<p className="mt-1 text-sm whitespace-pre-line">{message.body}</p>
									</li>
								))}
							</ol>
						)}

						<div className="border-t">
							<ReplyForm quote={quote} />
						</div>
					</section>
				</div>

				<aside className="space-y-5">
					<section className="bg-card rounded-lg border">
						<h2 className="font-heading border-b px-4 py-3 text-sm font-semibold">Contact</h2>
						<div className="space-y-1 p-4 text-sm">
							{quote.contact.company && (
								<p className="font-medium">{quote.contact.company}</p>
							)}
							<p>{quote.contact.name ?? "—"}</p>
							{quote.contact.email && (
								<p className="text-muted-foreground text-xs">{quote.contact.email}</p>
							)}
							{quote.contact.phone && (
								<p className="text-muted-foreground text-xs">{quote.contact.phone}</p>
							)}
						</div>
					</section>

					<section className="bg-card rounded-lg border">
						<h2 className="font-heading border-b px-4 py-3 text-sm font-semibold">Request</h2>
						<dl className="space-y-2 p-4 text-sm">
							<div className="flex justify-between gap-3">
								<dt className="text-muted-foreground">Submitted</dt>
								<dd className="text-right text-xs">{formatDate(quote.submittedAt)}</dd>
							</div>
							{quote.answeredAt && (
								<div className="flex justify-between gap-3">
									<dt className="text-muted-foreground">Answered</dt>
									<dd className="text-right text-xs">{formatDate(quote.answeredAt)}</dd>
								</div>
							)}
							{quote.expiresAt && (
								<div className="flex justify-between gap-3">
									<dt className="text-muted-foreground">Expires</dt>
									<dd className="text-right text-xs">{formatDate(quote.expiresAt)}</dd>
								</div>
							)}
							<div className="flex justify-between gap-3">
								<dt className="text-muted-foreground">Language</dt>
								<dd className="text-right text-xs uppercase">{quote.locale}</dd>
							</div>
						</dl>
					</section>

					{quote.status === "ACCEPTED" && (
						<div className="bg-accent-soft rounded-lg border p-4 text-sm">
							<p>
								<strong>Accepted.</strong> The customer turns this into an order from
								their own account — conversion carries their addresses and chosen
								payment method, which staff do not hold.
							</p>
						</div>
					)}
				</aside>
			</div>
		</div>
	)
}
