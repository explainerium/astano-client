"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { AlertCircle, Loader2, Trash2 } from "lucide-react"
import { Link } from "@/i18n/navigation"
import ClearBasketButton from "@/components/shared/basket/ClearBasketButton"
import QuantityStepper from "@/components/shared/basket/QuantityStepper"
import {
	useCartQuery,
	useClearCartMutation,
	useRemoveCartItemMutation,
	useUpdateCartItemMutation,
} from "@/redux/api/storefrontApi"
import useMoney from "@/lib/useMoney"
import { cn } from "@/lib/utils"
import type { CartLine } from "@/types/storefront"

const apiMessage = (error: unknown) => (error as { data?: { message?: string } })?.data?.message

/**
 * The cart.
 *
 * Every figure here — unit price, line total, subtotal — is the server's. The
 * page never sums anything, because the subtotal a customer reads has to be
 * the same number the order is written with (spec risk #1).
 *
 * Tax and shipping are absent on purpose: both depend on the delivery address
 * and, for B2B, on whether reverse charge applies (R10). Quoting either before
 * checkout knows the country would mean quoting it wrong.
 */
export const CartView = () => {
	// The shop's own separators and symbol. A function rather than an import,
	// so React Compiler can see that these prices depend on it.
	const formatMoney = useMoney()

	const t = useTranslations("cart")

	const { data: cart, isLoading, isError } = useCartQuery()
	const [updateItem, updateState] = useUpdateCartItemMutation()
	const [removeItem, removeState] = useRemoveCartItemMutation()
	const [clearCart, clearState] = useClearCartMutation()
	const [error, setError] = useState<string | null>(null)

	const busy = updateState.isLoading || removeState.isLoading || clearState.isLoading

	const run = async (action: () => Promise<unknown>) => {
		setError(null)
		try {
			await action()
		} catch (caught) {
			setError(apiMessage(caught) ?? t("updateFailed"))
		}
	}

	if (isLoading) {
		return (
			<p className="text-muted-foreground py-24 text-center text-sm">
				<Loader2 className="mr-2 inline size-4 animate-spin" />
				…
			</p>
		)
	}

	if (isError || !cart || !cart.items.length) {
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

	/** An option line rides along with its parent and is not independently editable. */
	const renderOption = (option: Omit<CartLine, "options">) => (
		<div key={option.id} className="text-muted-foreground flex gap-3 border-l-2 py-2 pl-4 text-sm">
			<span className="flex-1">
				<span className="text-xs uppercase">{t("includedOption")}</span>
				<span className="text-foreground block">{option.name}</span>
				<span className="text-xs">
					{option.quantity} × {formatMoney(option.unitPrice) ?? "—"}
				</span>
			</span>
			<span className="font-medium">{formatMoney(option.lineTotal)}</span>
		</div>
	)

	return (
		<div className="mx-auto w-full max-w-[1400px] px-6 py-12">
			<div className="mb-8 flex flex-wrap items-baseline gap-4">
				<h1 className="font-heading text-3xl font-extrabold tracking-tight sm:text-4xl">
					{t("title")}
				</h1>
				<p className="text-muted-foreground text-sm">
					{t("itemCount", { count: cart.lineCount })}
				</p>
				<div className="ml-auto">
					<ClearBasketButton
						label={t("clear")}
						confirmMessage={t("clearConfirm")}
						disabled={busy}
						onConfirm={() => void run(() => clearCart().unwrap())}
					/>
				</div>
			</div>

			{!!cart.issues.length && (
				<div className="border-destructive/40 bg-destructive/5 text-destructive mb-6 border p-4 text-sm">
					<ul className="space-y-1">
						{cart.issues.includes("BELOW_MOQ") && (
							<li className="flex items-center gap-2">
								<AlertCircle className="size-4 shrink-0" />
								{t("issueBelowMoq")}
							</li>
						)}
						{cart.issues.includes("OUT_OF_STOCK") && (
							<li className="flex items-center gap-2">
								<AlertCircle className="size-4 shrink-0" />
								{t("issueOutOfStock")}
							</li>
						)}
					</ul>
				</div>
			)}

			{error && (
				<p className="text-destructive mb-6 flex items-center gap-2 text-sm" role="alert">
					<AlertCircle className="size-4 shrink-0" />
					{error}
				</p>
			)}

			<div className="grid gap-10 lg:grid-cols-[1fr_340px] lg:items-start">
				<ul className="divide-y border-y">
					{cart.items.map((line) => (
						<li key={line.id} className="py-6">
							<div className="flex gap-5">
								<Link
									href={{ pathname: "/products/[slug]", params: { slug: line.slug } }}
									className="bg-muted size-24 shrink-0 overflow-hidden"
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
										<QuantityStepper
											value={line.quantity}
											min={line.moq > 0 ? line.moq : 1}
											max={line.availableStock}
											onCommit={(quantity) =>
												void run(() => updateItem({ id: line.id, quantity }).unwrap())
											}
										/>

										<span
											className={cn(
												"text-muted-foreground text-sm transition-opacity",
												(cart.repricing ?? []).includes(line.id) && "opacity-40"
											)}
										>
											{formatMoney(line.unitPrice)} {t("exclVat")}
										</span>

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
									{!line.inStock && <p className="text-destructive mt-2 text-sm">{t("outOfStock")}</p>}
									{line.inStock &&
										line.availableStock !== null &&
										line.availableStock < line.quantity * 2 && (
											<p className="text-muted-foreground mt-2 text-sm">
												{t("onlyLeft", { count: line.availableStock })}
											</p>
										)}

									{!!line.options?.length && (
										<div className="mt-3 space-y-1">{line.options.map(renderOption)}</div>
									)}
								</div>

								<div className="shrink-0 text-right font-semibold">
									{formatMoney(line.lineTotal)}
								</div>
							</div>
						</li>
					))}
				</ul>

				<aside className="bg-muted/50 p-6 lg:sticky lg:top-6">
					<div className="flex items-baseline justify-between">
						<span className="font-heading text-lg font-semibold">{t("subtotal")}</span>
						<span className="text-xl font-bold">{formatMoney(cart.subtotal)}</span>
					</div>
					<p className="text-muted-foreground mt-1 text-right text-xs">{t("exclVat")}</p>

					<p className="text-muted-foreground mt-4 text-sm leading-relaxed">{t("vatNote")}</p>

					<Link
						href="/checkout"
						aria-disabled={!cart.checkoutReady}
						onClick={(event) => {
							if (!cart.checkoutReady) event.preventDefault()
						}}
						className={cn(
							"bg-primary text-primary-foreground mt-6 block px-6 py-3.5 text-center text-sm font-semibold tracking-wide uppercase transition-opacity",
							cart.checkoutReady ? "hover:opacity-90" : "pointer-events-none opacity-50"
						)}
					>
						{t("checkout")}
					</Link>

					{!cart.checkoutReady && (
						<p className="text-destructive mt-3 text-center text-sm">{t("cannotCheckout")}</p>
					)}

					<Link
						href="/products"
						className="text-muted-foreground hover:text-primary mt-4 block text-center text-sm underline underline-offset-2"
					>
						{t("continueShopping")}
					</Link>
				</aside>
			</div>
		</div>
	)
}

export default CartView
