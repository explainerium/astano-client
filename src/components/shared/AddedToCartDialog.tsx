"use client"

import { useTranslations } from "next-intl"
import Image from "next/image"
import { CheckCircle2 } from "lucide-react"
import { Link } from "@/i18n/navigation"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

/**
 * The confirmation the client asked for after adding to the cart.
 *
 * A line of text under the button was easy to miss on a long product page —
 * the customer clicked, nothing visibly happened, and they clicked again. This
 * interrupts instead, and offers the two things anybody wants next: see the
 * cart, or pay.
 *
 * "Keep shopping" is the dismiss, and it is deliberately the quiet option
 * rather than the loud one: the customer is already on a product page, so
 * closing the dialog leaves them exactly where they wanted to be.
 */

interface Props {
	open: boolean
	onClose: () => void
	product: { name: string; image: string | null; quantity: number } | null
	/** Quote-only products go to the inquiry basket, which has no checkout. */
	quote?: boolean
}

const AddedToCartDialog = ({ open, onClose, product, quote }: Props) => {
	const t = useTranslations("shop")

	return (
		<Dialog open={open} onOpenChange={(next) => !next && onClose()}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<CheckCircle2 className="text-primary size-5 shrink-0" />
						{quote ? t("addedToQuote") : t("addedToCart")}
					</DialogTitle>
				</DialogHeader>

				{product && (
					<div className="flex items-center gap-3 border-y py-4">
						{product.image && (
							<Image
								src={product.image}
								alt=""
								width={56}
								height={56}
								className="size-14 shrink-0 object-cover"
							/>
						)}
						<div className="min-w-0">
							<p className="truncate font-medium" title={product.name}>
								{product.name}
							</p>
							<p className="text-muted-foreground text-sm">
								{t("quantity")}: {product.quantity}
							</p>
						</div>
					</div>
				)}

				<div className="flex flex-col gap-2 sm:flex-row">
					<Button asChild variant="outline" className="sm:flex-1">
						<Link href={quote ? "/quote-basket" : "/cart"}>
							{quote ? t("viewQuoteBasket") : t("viewCart")}
						</Link>
					</Button>

					{!quote && (
						<Button asChild className="sm:flex-1">
							<Link href="/checkout">{t("goToCheckout")}</Link>
						</Button>
					)}

					<Button variant="ghost" onClick={onClose} className="sm:flex-none">
						{t("keepShopping")}
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	)
}

export default AddedToCartDialog
