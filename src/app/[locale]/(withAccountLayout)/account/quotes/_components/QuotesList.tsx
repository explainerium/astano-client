"use client"

import { useLocale, useTranslations } from "next-intl"
import { Loader2 } from "lucide-react"
import { Link } from "@/i18n/navigation"
import { useMyQuotesQuery } from "@/redux/api/storefrontApi"
import { formatDate } from "@/lib/dates"
import useMoney from "@/lib/useMoney"
import StatusChip from "../../../_components/StatusChip"

export const QuotesList = () => {
	// The shop's own separators and symbol. A function rather than an import,
	// so React Compiler can see that these prices depend on it.
	const formatMoney = useMoney()

	const t = useTranslations("account")
	const locale = useLocale()
	const { data: quotes = [], isLoading } = useMyQuotesQuery()

	if (isLoading) {
		return (
			<p className="text-muted-foreground py-16 text-center text-sm">
				<Loader2 className="mr-2 inline size-4 animate-spin" />…
			</p>
		)
	}

	if (!quotes.length) {
		return (
			<div className="py-16 text-center">
				<p className="text-muted-foreground text-sm">{t("noQuotes")}</p>
				<Link
					href="/products"
					className="bg-primary text-primary-foreground mt-6 inline-flex px-7 py-3 text-sm font-semibold tracking-wide uppercase"
				>
					{t("startShopping")}
				</Link>
			</div>
		)
	}

	return (
		<div className="overflow-x-auto">
			<table className="w-full min-w-[640px] border-collapse text-sm">
				<thead>
					<tr className="border-b text-left">
						<th scope="col" className="text-muted-foreground py-3 font-medium">
							{t("quoteNumber")}
						</th>
						<th scope="col" className="text-muted-foreground py-3 font-medium">
							{t("quoteSubject")}
						</th>
						<th scope="col" className="text-muted-foreground py-3 font-medium">
							{t("quoteSubmitted")}
						</th>
						<th scope="col" className="text-muted-foreground py-3 font-medium">
							{t("quoteStatus")}
						</th>
						<th scope="col" className="text-muted-foreground py-3 text-right font-medium">
							{t("quotedTotal")}
						</th>
						<th scope="col" className="sr-only">
							{t("viewQuote")}
						</th>
					</tr>
				</thead>
				<tbody className="divide-y">
					{quotes.map((quote) => (
						<tr key={quote.id}>
							<td className="py-4 font-medium">{quote.quoteNumber}</td>
							<td className="py-4">{quote.title}</td>
							<td className="text-muted-foreground py-4">
								{formatDate(quote.submittedAt, locale)}
							</td>
							<td className="py-4">
								<StatusChip status={quote.status} kind="quoteStatus" />
							</td>
							<td className="py-4 text-right">
								{quote.quotedSubtotal ? (
									<span className="font-semibold">
										{formatMoney(quote.quotedSubtotal)}
									</span>
								) : (
									<span className="text-muted-foreground italic">{t("awaitingPrice")}</span>
								)}
							</td>
							<td className="py-4 text-right">
								<Link
									href={{ pathname: "/account/quotes/[id]", params: { id: quote.id } }}
									className="text-primary underline underline-offset-2"
								>
									{t("viewQuote")}
								</Link>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	)
}

export default QuotesList
