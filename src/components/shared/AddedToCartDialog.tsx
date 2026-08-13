"use client"

import { useTranslations } from "next-intl"
import Image from "next/image"
import { Check } from "lucide-react"
import { Link } from "@/i18n/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

/**
 * The confirmation shown after something goes in the cart.
 *
 * A line of text under the button was easy to miss on a long product page —
 * the customer clicked, nothing visibly happened, and they clicked again. This
 * interrupts instead, and offers the two things anybody wants next: see the
 * cart, or pay.
 *
 * Every add-to-cart on the shop ends here — product page, quick view, wishlist
 * — so a customer learns the confirmation once and recognises it everywhere.
 *
 * It borrows the shop's own vocabulary rather than the admin's: square corners,
 * uppercase CTAs, the heading face. Built from the default dialog parts it read
 * as a component from a different site, which is most of what made it feel
 * out of place.
 */

interface Props {
	open: boolean
	onClose: () => void
	product: { name: string; image: string | null; quantity: number } | null
	/** Quote-only products go to the inquiry basket, which has no checkout. */
	quote?: boolean
}

/** The shop's call to action: square, uppercase, no rounding anywhere. */
const cta =
	"inline-flex w-full items-center justify-center px-6 py-3.5 text-xs font-semibold tracking-widest uppercase transition-opacity hover:opacity-90"

const AddedToCartDialog = ({ open, onClose, product, quote }: Props) => {
	const t = useTranslations("shop")

	return (
		<Dialog open={open} onOpenChange={(next) => !next && onClose()}>
			{/*
			 * p-0 so each band can own its own padding and the rules between them
			 * run the full width. Rounded corners are the dialog's alone — nothing
			 * inside repeats them, which is what the shop does everywhere else.
			 */}
			<DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-lg">
				<DialogHeader className="border-b px-6 py-5 pr-14">
					<DialogTitle className="font-heading flex items-center gap-3 text-left text-lg leading-tight font-bold tracking-tight">
						{/* A filled mark rather than a loose icon: it is the one thing
						    that has to read as "this worked" at a glance. */}
						<span className="bg-primary text-primary-foreground flex size-7 shrink-0 items-center justify-center rounded-full">
							<Check className="size-4" strokeWidth={3} />
						</span>
						{quote ? t("addedToQuote") : t("addedToCart")}
					</DialogTitle>
				</DialogHeader>

				{product && (
					<div className="flex items-center gap-4 px-6 py-5">
						{/*
						 * The box is drawn whether or not there is an image. A row that
						 * collapses to bare text when a product has no photo is the
						 * ragged look this layout is meant to avoid.
						 */}
						<div className="bg-muted relative size-20 shrink-0 overflow-hidden">
							{product.image && (
								<Image
									src={product.image}
									alt=""
									fill
									sizes="80px"
									className="object-cover"
								/>
							)}
						</div>

						<div className="min-w-0">
							<p className="leading-snug font-medium" title={product.name}>
								{product.name}
							</p>
							<p className="text-muted-foreground mt-1.5 text-sm">
								{t("quantity")}: <span className="tabular-nums">{product.quantity}</span>
							</p>
						</div>
					</div>
				)}

				<div className="bg-muted/40 space-y-3 border-t px-6 py-5">
					{/*
					 * Reversed on a phone so the paying action is the one under the
					 * thumb; side by side above it, where reading order puts the
					 * quieter option first.
					 */}
					<div
						className={cn(
							"flex flex-col-reverse gap-2.5 sm:grid",
							// A quote request has no checkout, so its one button takes the
							// whole width rather than sitting in half of a two-column grid.
							quote ? "sm:grid-cols-1" : "sm:grid-cols-2"
						)}
					>
						<Link
							href={quote ? "/quote-basket" : "/cart"}
							className={`${cta} border-foreground/20 hover:bg-muted border bg-transparent hover:opacity-100`}
						>
							{quote ? t("viewQuoteBasket") : t("viewCart")}
						</Link>

						{!quote && (
							<Link href="/checkout" className={`${cta} bg-primary text-primary-foreground`}>
								{t("goToCheckout")}
							</Link>
						)}
					</div>

					{/* The dismiss, deliberately quiet: the customer is already where
					    they wanted to be, so closing leaves them there. */}
					<button
						type="button"
						onClick={onClose}
						className="text-muted-foreground hover:text-foreground w-full text-sm underline-offset-4 transition-colors hover:underline"
					>
						{t("keepShopping")}
					</button>
				</div>
			</DialogContent>
		</Dialog>
	)
}

export default AddedToCartDialog
