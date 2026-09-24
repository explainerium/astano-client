"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { AlertCircle, CheckCircle2, Loader2, Trash2 } from "lucide-react"
import { Link } from "@/i18n/navigation"
import ClearBasketButton from "@/components/shared/basket/ClearBasketButton"
import QuantityStepper from "@/components/shared/basket/QuantityStepper"
import {
	useClearQuoteBasketMutation,
	useQuoteBasketQuery,
	useRemoveQuoteItemMutation,
	useUpdateQuoteItemMutation,
} from "@/redux/api/storefrontApi"
import type { QuoteBasketLine } from "@/types/storefront"
import { cn } from "@/lib/utils"
import QuoteLineArtwork from "./QuoteLineArtwork"
import QuoteSubmitForm from "./QuoteSubmitForm"

const apiMessage = (error: unknown) => (error as { data?: { message?: string } })?.data?.message

/**
 * The inquiry basket.
 *
 * There are no prices on this page and that is the whole point: a quote-only
 * product has no price to show anyone (R2), and even for priced products a
 * request is answered individually. Showing a running total here would promise
 * a figure staff have not agreed to.
 *
 * MOQ still applies — a request below the minimum is one nobody can fulfil —
 * so the same floor and the same warning appear as in the cart.
 */
export const QuoteBasketView = () => {
	const t = useTranslations("quoteBasket")

	const { data: basket, isLoading, isError } = useQuoteBasketQuery()
	const [updateItem, updateState] = useUpdateQuoteItemMutation()
	const [removeItem, removeState] = useRemoveQuoteItemMutation()
	const [clearBasket, clearState] = useClearQuoteBasketMutation()

	const [error, setError] = useState<string | null>(null)
	const [sent, setSent] = useState(false)
	/** Notes are held locally while typing and committed on blur. */
	const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({})

	const busy = updateState.isLoading || removeState.isLoading || clearState.isLoading

	const run = async (action: () => Promise<unknown>) => {
		setError(null)
		try {
			await action()
		} catch (caught) {
			setError(apiMessage(caught) ?? t("submitFailed"))
		}
	}

	/**
	 * One line — a product, or an option configured with one.
	 *
	 * An option is drawn under its product, smaller and indented, so an enquiry
	 * for a cutter with an engraving reads as one thing rather than two.
	 */
	const lineBody = (line: Omit<QuoteBasketLine, "options">, nested = false) => (
		<div className={cn("flex", nested ? "gap-4" : "gap-5")}>
			<Link
				href={{ pathname: "/products/[slug]", params: { slug: line.slug } }}
				className={cn("bg-muted shrink-0 overflow-hidden", nested ? "size-16" : "size-24")}
			>
				{line.image ? (
					// eslint-disable-next-line @next/next/no-img-element
					<img
						src={line.image.url}
						alt={line.name}
						loading="lazy"
						className="size-full object-contain"
					/>
				) : null}
			</Link>

			<div className="min-w-0 flex-1">
				<Link
					href={{ pathname: "/products/[slug]", params: { slug: line.slug } }}
					className="hover:text-primary font-medium transition-colors"
				>
					{line.name}
				</Link>

				{!!line.attributes.length && (
					<p className="text-muted-foreground mt-0.5 text-sm">
						{line.attributes.map((a) => a.label).join(" · ")}
					</p>
				)}
				{line.sku && <p className="text-muted-foreground mt-0.5 text-xs">{line.sku}</p>}

				<div className="mt-3 flex flex-wrap items-center gap-4">
					{line.followsMain ? (
						// Ordered in the product's quantity: changing the product
						// above changes this, so there is nothing to set here.
						<p className="text-sm">
							<span className="font-semibold tabular-nums">{line.quantity}</span>{" "}
							<span className="text-muted-foreground">
								{(line.followsPerUnits ?? 1) > 1
									? t("followsMainPer", { units: line.followsPerUnits ?? 1 })
									: t("followsMain")}
							</span>
						</p>
					) : (
						<QuantityStepper
							value={line.quantity}
							min={line.moq > 0 ? line.moq : 1}
							disabled={busy}
							onCommit={(quantity) =>
								void run(() => updateItem({ id: line.id, quantity }).unwrap())
							}
						/>
					)}

					<button
						type="button"
						onClick={() => void run(() => removeItem(line.id).unwrap())}
						disabled={busy}
						className="text-muted-foreground hover:text-destructive ml-auto inline-flex items-center gap-1.5 text-sm transition-colors"
					>
						<Trash2 className="size-4" />
						<span className="sr-only sm:not-sr-only">{t("remove")}</span>
					</button>
				</div>

				{line.belowMoq && (
					<p className="text-destructive mt-2 text-sm">
						{t("belowMoq", { quantity: line.moq })}
					</p>
				)}

				<QuoteLineArtwork
					itemId={line.id}
					files={line.files}
					artwork={line.artwork}
					missing={line.artworkMissing}
				/>

				<label className="mt-3 block">
					<span className="sr-only">{t("note")}</span>
					<input
						type="text"
						value={noteDrafts[line.id] ?? line.note ?? ""}
						placeholder={t("notePlaceholder")}
						disabled={busy}
						onChange={(event) =>
							setNoteDrafts((current) => ({ ...current, [line.id]: event.target.value }))
						}
						onBlur={() => {
							const draft = noteDrafts[line.id]
							if (draft === undefined || draft === (line.note ?? "")) return
							void run(() =>
								updateItem({
									id: line.id,
									quantity: line.quantity,
									note: draft,
								}).unwrap()
							)
						}}
						className="focus:border-primary w-full border px-3 py-2 text-sm outline-none"
					/>
				</label>
			</div>
		</div>
	)

	if (sent) {
		return (
			<div className="mx-auto w-full max-w-[720px] px-6 py-24 text-center">
				<CheckCircle2 className="text-primary mx-auto size-10" />
				<h1 className="font-heading mt-6 text-2xl font-extrabold tracking-tight">
					{t("submitted")}
				</h1>
				<p className="text-muted-foreground mt-3 text-sm leading-relaxed">{t("submittedNote")}</p>
				<Link
					href="/products"
					className="bg-primary text-primary-foreground mt-8 inline-flex px-7 py-3 text-sm font-semibold tracking-wide uppercase"
				>
					{t("continueShopping")}
				</Link>
			</div>
		)
	}

	if (isLoading) {
		return (
			<p className="text-muted-foreground py-24 text-center text-sm">
				<Loader2 className="mr-2 inline size-4 animate-spin" />…
			</p>
		)
	}

	if (isError || !basket || !basket.items.length) {
		return (
			<div className="py-24 text-center">
				<p className="text-muted-foreground text-sm">{t("empty")}</p>
				<Link
					href="/products"
					className="bg-primary text-primary-foreground mt-6 inline-flex px-7 py-3 text-sm font-semibold tracking-wide uppercase"
				>
					{t("continueShopping")}
				</Link>
			</div>
		)
	}

	return (
		<div className="mx-auto w-full max-w-[1400px] px-6 py-12">
			<div className="mb-3 flex flex-wrap items-baseline gap-4">
				<h1 className="font-heading text-3xl font-extrabold tracking-tight sm:text-4xl">
					{t("title")}
				</h1>
				<div className="ml-auto">
					<ClearBasketButton
						label={t("clear")}
						confirmMessage={t("clearConfirm")}
						disabled={busy}
						onConfirm={() => void run(() => clearBasket().unwrap())}
					/>
				</div>
			</div>
			<p className="text-muted-foreground mb-8 max-w-2xl text-sm leading-relaxed">{t("intro")}</p>

			{basket.issues.includes("BELOW_MOQ") && (
				<p className="border-destructive/40 bg-destructive/5 text-destructive mb-6 flex items-center gap-2 border p-4 text-sm">
					<AlertCircle className="size-4 shrink-0" />
					{t("issueBelowMoq")}
				</p>
			)}

			{basket.issues.includes("ARTWORK_REQUIRED") && (
				<p className="border-destructive/40 bg-destructive/5 text-destructive mb-6 flex items-center gap-2 border p-4 text-sm">
					<AlertCircle className="size-4 shrink-0" />
					{t("issueArtworkRequired")}
				</p>
			)}

			{error && (
				<p className="text-destructive mb-6 flex items-center gap-2 text-sm" role="alert">
					<AlertCircle className="size-4 shrink-0" />
					{error}
				</p>
			)}

			{/*
			 * 540 rather than 420, and the list takes what is left.
			 *
			 * The form was sized when it asked four questions. It now asks an
			 * address as well, and at 420px — 372 inside the panel's padding —
			 * every paired row was squeezing two fields into less than half a
			 * field each. The list is the side that can spare it: a line is an
			 * image, a name and a stepper, and it reads no better wide.
			 *
			 * minmax(0,…) on the list so a long product name wraps instead of
			 * pushing the form off the grid — 1fr alone refuses to shrink below
			 * its content.
			 */}
			<div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_540px] lg:items-start">
				<ul className={cn("divide-y border-y", busy && "opacity-60 transition-opacity")}>
					{basket.items.map((line) => (
						<li key={line.id} className="py-6">
							{lineBody(line)}

							{!!line.options?.length && (
								<ul className="mt-4 ml-6 space-y-5 border-l pl-5 sm:ml-12">
									{line.options.map((option) => (
										<li key={option.id}>{lineBody(option, true)}</li>
									))}
								</ul>
							)}
						</li>
					))}
				</ul>

				<aside className="bg-muted/50 p-6 lg:sticky lg:top-6">
					<h2 className="font-heading text-lg font-semibold">{t("details")}</h2>
					<p className="text-muted-foreground mt-2 mb-6 text-sm leading-relaxed">{t("noPrices")}</p>
					<QuoteSubmitForm onSubmitted={() => setSent(true)} />
				</aside>
			</div>
		</div>
	)
}

export default QuoteBasketView
