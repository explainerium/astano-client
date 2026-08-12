"use client"

import { useLocale, useTranslations } from "next-intl"
import { useState } from "react"
import { Download, Loader2 } from "lucide-react"
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
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table"
import { useNewsletterSubscribersQuery } from "@/redux/api/inboxApi"
import type { NewsletterSubscriber, SubscriptionStatus } from "@/types/inbox"

const ANY = "__any__"
const PER_PAGE = 50

const STATUS_CHIP: Record<SubscriptionStatus, { labelKey: string; className: string }> = {
	CONFIRMED: {
		labelKey: "subscriberConfirmed",
		className: "border-transparent bg-positive-soft text-positive",
	},
	/** Signed up but never clicked the link — no consent, so not mailable. */
	PENDING: {
		labelKey: "subscriberUnconfirmed",
		className: "border-transparent bg-accent-soft-strong text-primary",
	},
	UNSUBSCRIBED: { labelKey: "subscriberUnsubscribed", className: "text-muted-foreground" },
}

const formatDate = (value: string | null, locale = "de") =>
	value
		? new Date(value).toLocaleDateString(locale, {
				day: "2-digit",
				month: "short",
				year: "numeric",
			})
		: "—"

/**
 * CSV of the confirmed list, built in the browser from what is already loaded.
 *
 * Only CONFIRMED rows are exported. Double opt-in is what makes the list legal
 * to mail, and an export is exactly where an unconfirmed address would leak
 * into a campaign tool and stop being anyone's mistake to notice.
 */
const exportCsv = (rows: NewsletterSubscriber[]) => {
	const confirmed = rows.filter((r) => r.status === "CONFIRMED")

	const escape = (value: string | null) => `"${(value ?? "").replace(/"/g, '""')}"`
	const csv = [
		"email,name,locale,source,confirmed_at",
		...confirmed.map((r) =>
			[escape(r.email), escape(r.name), escape(r.locale), escape(r.source), escape(r.confirmedAt)].join(",")
		),
	].join("\n")

	const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }))
	const link = document.createElement("a")
	link.href = url
	link.download = "newsletter-confirmed.csv"
	link.click()
	URL.revokeObjectURL(url)
}

export default function NewsletterPage() {
	const t = useTranslations("admin")
	const locale = useLocale()
	const [status, setStatus] = useState<SubscriptionStatus | undefined>()
	const [page, setPage] = useState(1)

	const { data, isLoading, isFetching, isError, error } = useNewsletterSubscribersQuery({
		status,
		page,
		limit: PER_PAGE,
	})

	const subscribers = data?.data ?? []
	const meta = data?.meta
	const confirmedOnPage = subscribers.filter((s) => s.status === "CONFIRMED").length

	return (
		<div className="space-y-4">
			<Toolbar
				filters={
					<Select
						value={status ?? ANY}
						onValueChange={(value) => {
							setStatus(value === ANY ? undefined : (value as SubscriptionStatus))
							setPage(1)
						}}
					>
						<SelectTrigger className="w-44" aria-label={t("filterByStatus")}>
							<SelectValue placeholder={t("anyStatus")} />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value={ANY}>{t("anyStatus")}</SelectItem>
							{(Object.keys(STATUS_CHIP) as SubscriptionStatus[]).map((value) => (
								<SelectItem key={value} value={value}>
									{t(STATUS_CHIP[value].labelKey)}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				}
				primaryAction={
					<Button
						variant="outline"
						size="lg"
						disabled={!confirmedOnPage}
						onClick={() => exportCsv(subscribers)}
					>
						<Download />
						{t("exportConfirmed", { count: confirmedOnPage })}
					</Button>
				}
			/>

			{isLoading && (
				<div className="bg-card text-muted-foreground flex items-center justify-center gap-2 rounded-lg border p-16 text-sm">
					<Loader2 className="size-4 animate-spin" />{t("loadingSubscribers")}</div>
			)}

			{isError && (
				<div className="text-destructive bg-card rounded-lg border border-dashed p-16 text-center text-sm">
					{(error as { data?: { message?: string } })?.data?.message ??
						t("couldNotLoadSubscribers")}
				</div>
			)}

			{data && (
				<div className="bg-card overflow-hidden rounded-lg border">
					<div className="overflow-x-auto">
						<Table>
							<TableHeader className="bg-muted/50">
								<TableRow className="hover:bg-transparent">
									{[
									t("email"),
									t("name"),
									t("language"),
									t("source"),
									t("signedUp"),
									t("subscriberConfirmed"),
									t("status"),
								].map(
										(head) => (
											<TableHead
												key={head}
												className="text-muted-foreground text-xs font-medium tracking-wide uppercase"
											>
												{head}
											</TableHead>
										)
									)}
								</TableRow>
							</TableHeader>

							<TableBody>
								{!subscribers.length && (
									<TableRow className="hover:bg-transparent">
										<TableCell colSpan={7} className="h-40 text-center">
											<p className="text-muted-foreground text-sm">{t("noSubscribersYetTheyArriveFrom")}</p>
										</TableCell>
									</TableRow>
								)}

								{subscribers.map((subscriber) => {
									const chip = STATUS_CHIP[subscriber.status]

									return (
										<TableRow key={subscriber.id}>
											<TableCell className="text-sm">{subscriber.email}</TableCell>
											<TableCell className="text-sm">{subscriber.name ?? "—"}</TableCell>
											<TableCell className="text-xs uppercase">{subscriber.locale}</TableCell>
											<TableCell className="text-muted-foreground text-xs">
												{subscriber.source ?? "—"}
											</TableCell>
											<TableCell className="text-muted-foreground text-xs">
												{formatDate(subscriber.createdAt, locale)}
											</TableCell>
											<TableCell className="text-muted-foreground text-xs">
												{formatDate(subscriber.confirmedAt, locale)}
											</TableCell>
											<TableCell>
												<Badge variant="outline" className={chip.className}>
													{t(chip.labelKey)}
												</Badge>
											</TableCell>
										</TableRow>
									)
								})}
							</TableBody>
						</Table>
					</div>

					<div className="text-muted-foreground flex flex-wrap items-center gap-3 border-t px-4 py-2.5 text-xs">
						<span>
							{meta
								? t("paginationSubscribers", {
										count: meta.total,
										page: meta.page,
										pages: meta.totalPages,
									})
								: t("countSubscribers", { count: subscribers.length })}
						</span>
						{isFetching && <Loader2 className="size-3 animate-spin" />}
						<span className="text-muted-foreground">
							{t("consentEvidence")}
						</span>
						{!!meta && (
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
						)}
					</div>
				</div>
			)}
		</div>
	)
}
