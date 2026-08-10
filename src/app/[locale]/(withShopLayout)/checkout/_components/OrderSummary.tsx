"use client"

import { useTranslations } from "next-intl"
import { AlertCircle, Info, Loader2 } from "lucide-react"
import useMoney from "@/lib/useMoney"
import type { CartView, CheckoutPreview } from "@/types/storefront"

/**
 * The totals panel.
 *
 * Every figure is the server's. Notably the tax is not derived from the
 * subtotal here: shipping is taxable, so choosing a delivery method moves the
 * tax as well as the shipping line, and only the preview knows by how much.
 *
 * Two states get called out rather than quietly showing €0.00 of VAT:
 * reverse charge, which is a rule, and an unconfigured destination, which is a
 * gap. They look identical on a receipt and mean completely different things.
 */
export const OrderSummary = ({
	cart,
	preview,
	calculating,
}: {
	cart: CartView
	preview: CheckoutPreview | null
	calculating: boolean
}) => {
	// The shop's own separators and symbol. A function rather than an import,
	// so React Compiler can see that these prices depend on it.
	const formatMoney = useMoney()

	const t = useTranslations("checkout")

	const row = (label: string, value: string | null, muted = true) => (
		<div className="flex justify-between gap-4 text-sm">
			<span className={muted ? "text-muted-foreground" : undefined}>{label}</span>
			<span>{value ?? "—"}</span>
		</div>
	)

	// Stickiness belongs to the whole right-hand column rather than to this
	// panel alone: sticking only the panel leaves its siblings — the errors,
	// the hints and the submit button — to scroll underneath it.
	return (
		<aside className="bg-muted/50 p-6">
			<h2 className="font-heading mb-5 text-lg font-semibold">{t("summary")}</h2>

			<ul className="mb-5 space-y-3 border-b pb-5">
				{cart.items.map((line) => (
					<li key={line.id} className="flex justify-between gap-3 text-sm">
						<span className="min-w-0">
							<span className="block truncate font-medium">{line.name}</span>
							<span className="text-muted-foreground text-xs">
								{line.quantity} × {formatMoney(line.unitPrice)}
							</span>
							{!!line.options?.length &&
								line.options.map((option) => (
									<span key={option.id} className="text-muted-foreground block text-xs">
										+ {option.name} ({option.quantity})
									</span>
								))}
						</span>
						<span className="shrink-0">{formatMoney(line.lineTotal)}</span>
					</li>
				))}
			</ul>

			{!preview ? (
				<p className="text-muted-foreground flex items-center gap-2 text-sm">
					{calculating ? (
						<>
							<Loader2 className="size-4 animate-spin" />
							{t("calculating")}
						</>
					) : (
						t("enterAddressFirst")
					)}
				</p>
			) : (
				<div className="space-y-2.5">
					{row(t("subtotal"), formatMoney(preview.subtotal))}
					{row(t("shipping"), formatMoney(preview.shippingTotal))}

					{preview.taxLines.length
						? preview.taxLines.map((line, index) => (
								<div key={index} className="flex justify-between gap-4 text-sm">
									<span className="text-muted-foreground">
										{t("tax")} ({line.ratePercent}%)
									</span>
									<span>{formatMoney(line.amount)}</span>
								</div>
							))
						: row(t("tax"), formatMoney(preview.taxTotal))}

					{row(t("weight"), `${Number(preview.totalWeightKg).toFixed(2)} kg`)}

					<div className="mt-4 flex justify-between gap-4 border-t pt-4">
						<span className="font-heading text-lg font-semibold">{t("grandTotal")}</span>
						<span className="text-xl font-bold">{formatMoney(preview.grandTotal)}</span>
					</div>

					{preview.reverseCharged && (
						<p className="text-muted-foreground mt-4 flex gap-2 text-xs leading-relaxed">
							<Info className="mt-0.5 size-4 shrink-0" />
							{t("reverseCharged")}
						</p>
					)}

					{preview.taxUnconfigured && (
						<p className="text-destructive mt-4 flex gap-2 text-xs leading-relaxed">
							<AlertCircle className="mt-0.5 size-4 shrink-0" />
							{t("taxUnconfigured")}
						</p>
					)}

					{calculating && (
						<p className="text-muted-foreground mt-3 flex items-center gap-2 text-xs">
							<Loader2 className="size-3 animate-spin" />
							{t("calculating")}
						</p>
					)}
				</div>
			)}
		</aside>
	)
}

export default OrderSummary
