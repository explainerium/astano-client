"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { AlertCircle, ArrowRight, Loader2, Minus, Plus, ShoppingCart, Trash2, X } from "lucide-react"
import { Link } from "@/i18n/navigation"
import {
	useCartQuery,
	useRemoveCartItemMutation,
	useUpdateCartItemMutation,
} from "@/redux/api/storefrontApi"
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet"
import { formatMoney } from "@/lib/money"
import { cn } from "@/lib/utils"
import type { CartLine } from "@/types/storefront"

/**
 * The basket, without leaving the page.
 *
 * A shopper who has just added something wants to know it landed and to keep
 * browsing — sending them to /cart for that costs a page load in each
 * direction. The full cart page is still the place to review an order properly,
 * which is why the drawer ends in two buttons rather than one: carry on to
 * checkout, or open the page.
 *
 * Every price in here comes back from the API resolved for this visitor at this
 * quantity. Changing a quantity refetches; nothing is multiplied locally.
 */

const LineRow = ({
	line,
	repricing,
	onQuantity,
	onRemove,
}: {
	line: CartLine
	/**
	 * This line's figures are waiting on the server.
	 *
	 * Only the money is held back. The quantity is already correct — it is what
	 * the customer just pressed — so the stepper stays live and the numbers
	 * beside it settle a moment later.
	 */
	repricing: boolean
	onQuantity: (quantity: number) => void
	onRemove: () => void
}) => {
	const t = useTranslations("cart")
	const min = line.moq > 0 ? line.moq : 1

	return (
		<li className="flex gap-4 py-4">
			<Link
				href={{ pathname: "/products/[slug]", params: { slug: line.slug } }}
				className="bg-muted size-20 shrink-0 overflow-hidden border"
			>
				{line.image ? (
					// eslint-disable-next-line @next/next/no-img-element
					<img
						src={line.image.url}
						alt=""
						loading="lazy"
						className="size-full object-contain"
					/>
				) : null}
			</Link>

			<div className="flex min-w-0 flex-1 flex-col gap-1.5">
				<div className="flex items-start gap-2">
					<Link
						href={{ pathname: "/products/[slug]", params: { slug: line.slug } }}
						className="hover:text-primary min-w-0 flex-1 text-sm leading-snug font-medium transition-colors"
					>
						{line.name}
					</Link>
					<button
						type="button"
						onClick={onRemove}
						aria-label={`${t("remove")} ${line.name}`}
						className="text-muted-foreground hover:text-destructive -mt-0.5 -mr-1 shrink-0 p-1 transition-colors disabled:opacity-40"
					>
						<Trash2 className="size-4" />
					</button>
				</div>

				{!!line.attributes.length && (
					<p className="text-muted-foreground truncate text-xs">
						{line.attributes.map((a) => a.label).join(" · ")}
					</p>
				)}

				{/* Options bought with this line, named rather than counted — a
				    configured cutter with an engraving is two facts, not one. */}
				{!!line.options?.length && (
					<ul className="text-muted-foreground space-y-0.5 text-xs">
						{line.options.map((option) => (
							<li key={option.id} className="truncate">
								+ {option.name} × {option.quantity}
							</li>
						))}
					</ul>
				)}

				<div className="mt-auto flex items-end justify-between gap-3 pt-1">
					<div className="flex items-center border">
						<button
							type="button"
							onClick={() => onQuantity(line.quantity - 1)}
							disabled={line.quantity <= min}
							aria-label="-"
							className="px-2.5 py-1.5 transition-colors hover:bg-neutral-50 disabled:opacity-40"
						>
							<Minus className="size-3.5" />
						</button>
						<span className="w-10 text-center text-sm tabular-nums">{line.quantity}</span>
						<button
							type="button"
							onClick={() => onQuantity(line.quantity + 1)}
							aria-label="+"
							className="px-2.5 py-1.5 transition-colors hover:bg-neutral-50 disabled:opacity-40"
						>
							<Plus className="size-3.5" />
						</button>
					</div>

					<div className={cn("text-right transition-opacity", repricing && "opacity-40")}>
						<div className="text-sm font-semibold tabular-nums">
							{formatMoney(line.lineTotal)}
						</div>
						{line.quantity > 1 && (
							<div className="text-muted-foreground text-[11px] tabular-nums">
								{formatMoney(line.unitPrice)} × {line.quantity}
							</div>
						)}
					</div>
				</div>

				{line.belowMoq && (
					<p className="text-destructive flex items-center gap-1.5 text-xs">
						<AlertCircle className="size-3.5 shrink-0" />
						{t("belowMoq", { quantity: line.moq })}
					</p>
				)}
			</div>
		</li>
	)
}

export const CartDrawer = ({
	open,
	onOpenChange,
}: {
	open: boolean
	onOpenChange: (open: boolean) => void
}) => {
	const t = useTranslations("cart")

	const { data: cart, isLoading } = useCartQuery()
	const [updateItem, updateState] = useUpdateCartItemMutation()
	const [removeItem, removeState] = useRemoveCartItemMutation()

	const [error, setError] = useState<string | null>(null)
	const busy = updateState.isLoading || removeState.isLoading

	const run = async (action: () => Promise<unknown>) => {
		setError(null)
		try {
			await action()
		} catch (caught) {
			setError(
				(caught as { data?: { message?: string } })?.data?.message ?? t("updateFailed")
			)
		}
	}

	const lines = cart?.items ?? []
	const isEmpty = !isLoading && !lines.length

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent
				aria-describedby={undefined}
				className="gap-0 p-0"
				// Focus the panel itself rather than the first control: opening a
				// basket should not put the cursor on a "remove" button.
				onOpenAutoFocus={(event) => event.preventDefault()}
			>
				<header className="flex items-center gap-3 border-b px-5 py-4">
					<ShoppingCart className="size-5 shrink-0" strokeWidth={1.5} />
					<SheetTitle className="flex-1">{t("title")}</SheetTitle>
					{!!lines.length && (
						<span className="bg-ink text-ink-foreground flex size-6 items-center justify-center rounded-full text-xs tabular-nums">
							{cart?.lineCount ?? 0}
						</span>
					)}
					<SheetClose
						aria-label={t("close")}
						className="hover:bg-muted -mr-1.5 rounded-full p-1.5 transition-colors"
					>
						<X className="size-5" />
					</SheetClose>
				</header>

				{isLoading && (
					<div className="text-muted-foreground flex flex-1 items-center justify-center gap-2 text-sm">
						<Loader2 className="size-4 animate-spin" />
						{t("loading")}
					</div>
				)}

				{isEmpty && (
					<div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
						<span className="bg-muted text-muted-foreground flex size-16 items-center justify-center rounded-full">
							<ShoppingCart className="size-7" strokeWidth={1.25} />
						</span>
						<div>
							<p className="font-heading text-base font-semibold">{t("empty")}</p>
							<p className="text-muted-foreground mt-1 text-sm">{t("emptyHint")}</p>
						</div>
						<SheetClose asChild>
							<Link
								href="/products"
								className="bg-ink text-ink-foreground mt-2 px-6 py-3 text-sm font-semibold tracking-wide uppercase transition-opacity hover:opacity-90"
							>
								{t("continueShopping")}
							</Link>
						</SheetClose>
					</div>
				)}

				{!isLoading && !isEmpty && (
					<>
						{/* The only scrolling region — the header and the summary stay
						    put, so the totals never scroll away from the buttons that
						    act on them. */}
					{/*
						 * No blanket dimming while a change is in flight — that would
						 * grey out the very number the customer just pressed. Each line
						 * dims its own figures instead, and the stepper stays live so a
						 * second press does not have to wait for the first.
						 */}
						<div className="flex-1 overflow-y-auto overscroll-contain px-5">
							<ul className="divide-y">
								{lines.map((line) => (
									<LineRow
										key={line.id}
										line={line}
										repricing={(cart?.repricing ?? []).includes(line.id)}
										onQuantity={(quantity) =>
											void run(() => updateItem({ id: line.id, quantity }).unwrap())
										}
										onRemove={() => void run(() => removeItem(line.id).unwrap())}
									/>
								))}
							</ul>
						</div>

						<footer className="space-y-4 border-t px-5 py-4">
							{error && (
								<p role="alert" className="text-destructive flex items-center gap-2 text-sm">
									<AlertCircle className="size-4 shrink-0" />
									{error}
								</p>
							)}

							{/*
							 * Subtotal only, and it says so.
							 *
							 * Shipping and tax depend on an address nobody has given yet, and
							 * a "total" here that changes at checkout is the sort of surprise
							 * that loses the order.
							 */}
							<div className="flex items-baseline justify-between">
								<span className="text-sm font-medium">{t("subtotal")}</span>
								<span
									className={cn(
										"font-heading text-xl font-bold tabular-nums transition-opacity",
										busy && "opacity-40"
									)}
								>
									{formatMoney(cart?.subtotal ?? null)}
								</span>
							</div>
							<p className="text-muted-foreground -mt-3 text-xs">{t("vatNote")}</p>

							{!!cart?.issues.length && (
								<p className="text-destructive flex items-start gap-2 text-xs">
									<AlertCircle className="mt-px size-3.5 shrink-0" />
									{cart.issues.includes("BELOW_MOQ")
										? t("issueBelowMoq")
										: t("issueOutOfStock")}
								</p>
							)}

							<div className="grid gap-2">
								<SheetClose asChild>
									<Link
										href="/checkout"
										aria-disabled={!cart?.checkoutReady}
										onClick={(event) => {
											// The API refuses a cart with issues anyway; this stops the
											// journey at the door rather than at the till.
											if (!cart?.checkoutReady) event.preventDefault()
										}}
										className={cn(
											"bg-primary text-primary-foreground inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-semibold tracking-wide uppercase transition-opacity",
											cart?.checkoutReady
												? "hover:opacity-90"
												: "pointer-events-none opacity-50"
										)}
									>
										{t("checkout")}
										<ArrowRight className="size-4" />
									</Link>
								</SheetClose>

								<SheetClose asChild>
									<Link
										href="/cart"
										className="border-ink hover:bg-ink hover:text-ink-foreground inline-flex items-center justify-center border px-6 py-3 text-sm font-semibold tracking-wide uppercase transition-colors"
									>
										{t("viewCart")}
									</Link>
								</SheetClose>
							</div>
						</footer>
					</>
				)}

				<SheetDescription className="sr-only">{t("title")}</SheetDescription>
			</SheetContent>
		</Sheet>
	)
}

export default CartDrawer
