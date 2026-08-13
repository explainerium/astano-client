"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { AlertCircle, Loader2, Minus, Plus, X } from "lucide-react"
import { Link, useRouter } from "@/i18n/navigation"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { useAddToCartMutation, useShopProductQuery } from "@/redux/api/storefrontApi"
import { usePublicSettingsQuery } from "@/redux/api/settingApi"
import useMoney from "@/lib/useMoney"
import TierTable from "@/app/[locale]/(withShopLayout)/products/[slug]/_components/TierTable"
import type { PublicProduct } from "@/types/storefront"

/**
 * The grid's quick view.
 *
 * Horizontal — gallery left, summary right — at the width the live shop uses
 * (920px, `quick_view_layout: horizontal`). It exists so a shopper scanning a
 * category can check a price, a minimum and a photograph without losing their
 * place in the grid; anything that needs more than that is the product page,
 * and the dialog says so with a link rather than trying to be one.
 *
 * It fetches the full product on open rather than rendering the card's data,
 * because a listing carries a *range* ("from €1.24") and this needs the price
 * at a chosen quantity. Fetching only when open keeps a grid of twenty-four
 * cards from making twenty-four requests nobody asked for.
 */

/**
 * How long the dialog takes to leave — `duration-100` on DialogContent, plus a
 * little, so the confirmation that replaces it starts on an empty stage.
 */
const EXIT_MS = 150

export const QuickViewDialog = ({
	product,
	onOpenChange,
	onAdded,
}: {
	/** Null when closed. The card passes the product it was clicked on. */
	product: PublicProduct | null
	onOpenChange: (open: boolean) => void
	/**
	 * What went in the cart, for whoever owns the confirmation.
	 *
	 * Reported upwards rather than shown here because this is already a dialog,
	 * and a dialog opening on top of a dialog is a stack the customer has to
	 * dismiss twice. Quick view closes and the confirmation takes its place.
	 */
	onAdded: (added: { name: string; image: string | null; quantity: number }) => void
}) => {
	// The shop's own separators and symbol. A function rather than an import,
	// so React Compiler can see that these prices depend on it.
	const formatMoney = useMoney()

	const t = useTranslations("shop")

	const [quantity, setQuantity] = useState(1)
	/**
	 * Only ever a failure now.
	 *
	 * Success used to be reported here too, as a line of text under the button.
	 * It closes the dialog and opens the confirmation instead, so the one thing
	 * left to say in place is why nothing happened.
	 */
	const [error, setError] = useState<string | null>(null)

	const { data, isFetching } = useShopProductQuery(
		product ? { slug: product.slug, quantity } : { slug: "" },
		{ skip: !product }
	)

	const [addToCart, cartState] = useAddToCartMutation()
	const router = useRouter()
	const { data: shopSettings } = usePublicSettingsQuery()

	const detail = data
	const variant = detail?.variants.find((v) => v.isDefault) ?? detail?.variants[0] ?? null
	const min = variant && variant.moq > 0 ? variant.moq : 1
	const belowMoq = quantity < min

	/**
	 * The quantity resets to the product's own minimum each time the dialog
	 * opens on a different product — carrying 500 over from the last card would
	 * quote a price for something nobody asked about.
	 */
	const [seededFor, setSeededFor] = useState<string | null>(null)
	if (product && seededFor !== product.id) {
		setSeededFor(product.id)
		setQuantity(1)
		setError(null)
	}
	if (variant && quantity < min) setQuantity(min)

	const image = detail?.featuredImage ?? product?.featuredImage ?? null
	const hero = image ? (image.srcset.detail ?? image.srcset.grid ?? image.url) : null

	const add = async () => {
		if (!variant || belowMoq) return
		setError(null)
		try {
			await addToCart({ variantId: variant.id, quantity }).unwrap()

			// Same rule as the product page. A quick view that adds silently while
			// the product page jumps to the cart is the sort of inconsistency the
			// setting exists to prevent.
			if (shopSettings?.["cart.redirectAfterAdd"] === true) {
				router.push("/cart")
				return
			}

			/*
			 * The same confirmation the product page shows, rather than the line of
			 * text that used to sit under this button.
			 *
			 * That line was the client's complaint: adding from a card told you it
			 * had worked and then left you to find the cart yourself. What anybody
			 * wants next is one of two things, so the confirmation offers both.
			 *
			 * This one leaves before that one arrives. Closing and opening in the
			 * same commit puts two modals through their transitions at once, each
			 * portalled into the body and each claiming focus and the scroll lock
			 * on the way past the other. It also looked like a flicker.
			 */
			const added = { name: product?.name ?? "", image: hero, quantity }
			onOpenChange(false)
			setTimeout(() => onAdded(added), EXIT_MS)
		} catch (cause) {
			setError((cause as { data?: { message?: string } })?.data?.message ?? t("addFailed"))
		}
	}

	return (
		<Dialog open={!!product} onOpenChange={onOpenChange}>
			<DialogContent
				showCloseButton={false}
				className="max-h-[90vh] gap-0 overflow-y-auto p-0 sm:max-w-[920px]"
			>
				<button
					type="button"
					onClick={() => onOpenChange(false)}
					aria-label={t("close")}
					className="hover:bg-muted absolute top-3 right-3 z-10 rounded-full bg-white/80 p-2 transition-colors"
				>
					<X className="size-5" />
				</button>

				<div className="grid gap-0 md:grid-cols-2">
					<div className="bg-muted flex aspect-square items-center justify-center overflow-hidden">
						{hero ? (
							// eslint-disable-next-line @next/next/no-img-element
							<img src={hero} alt="" className="size-full object-contain" />
						) : (
							<span className="text-muted-foreground text-xs">{t("noImage")}</span>
						)}
					</div>

					<div className="flex flex-col gap-4 p-6 md:p-8">
						<div>
							<DialogTitle className="font-heading text-xl leading-tight font-bold tracking-tight">
								{product?.name ?? ""}
							</DialogTitle>
							{!!detail?.categories.length && (
								<p className="text-muted-foreground mt-1 text-xs">
									{detail.categories.map((c) => c.name).join(", ")}
								</p>
							)}
						</div>

						{isFetching && !detail ? (
							<div className="text-muted-foreground flex items-center gap-2 py-8 text-sm">
								<Loader2 className="size-4 animate-spin" />
								{t("loading")}
							</div>
						) : detail?.quoteOnly ? (
							<p className="text-muted-foreground italic">{t("priceOnRequest")}</p>
						) : (
							<>
								<div className="flex items-baseline gap-2">
									<span className="font-heading text-2xl font-bold">
										{formatMoney(variant?.unitPrice ?? null) ?? "—"}
									</span>
									{variant?.onSale && variant.listPrice && (
										<span className="text-muted-foreground text-sm line-through">
											{formatMoney(variant.listPrice)}
										</span>
									)}
									<span className="text-muted-foreground text-xs">{t("exclVat")}</span>
								</div>

								{detail?.shortDescription && (
									<p className="text-muted-foreground line-clamp-4 text-sm leading-relaxed">
										{detail.shortDescription}
									</p>
								)}

								{!!variant?.tiers.length && (
									<TierTable
										tiers={variant.tiers}
										quantity={quantity}
										baseRow={null}
										title={t("buyMoreSaveMore")}
										compact
									/>
								)}

								<div className="flex flex-wrap items-center gap-3">
									<div className="flex items-center border">
										<button
											type="button"
											onClick={() => setQuantity(Math.max(min, quantity - 1))}
											disabled={quantity <= min}
											aria-label="-"
											className="px-3 py-2 disabled:opacity-40"
										>
											<Minus className="size-4" />
										</button>
										<input
											type="number"
											min={min}
											value={quantity}
											onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
											className="w-16 border-x py-2 text-center text-sm outline-none"
											aria-label={t("quantity")}
										/>
										<button
											type="button"
											onClick={() => setQuantity(quantity + 1)}
											aria-label="+"
											className="px-3 py-2"
										>
											<Plus className="size-4" />
										</button>
									</div>

									{min > 1 && (
										<span className="text-muted-foreground text-xs">
											{t("minimumOrder", { quantity: min })}
										</span>
									)}
								</div>

								{belowMoq && (
									<p className="text-destructive flex items-center gap-1.5 text-sm">
										<AlertCircle className="size-4 shrink-0" />
										{t("belowMoq", { quantity: min })}
									</p>
								)}

								<button
									type="button"
									onClick={add}
									disabled={cartState.isLoading || belowMoq || !variant?.inStock}
									className="bg-primary text-primary-foreground inline-flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-semibold tracking-wide uppercase transition-opacity hover:opacity-90 disabled:opacity-50"
								>
									{cartState.isLoading && <Loader2 className="size-4 animate-spin" />}
									{t("addToCart")}
								</button>

								{error && (
									<p role="alert" className="text-destructive flex items-center gap-2 text-sm">
										<AlertCircle className="size-4 shrink-0" />
										{error}
									</p>
								)}
							</>
						)}

						{/* Quick view is a glance, not a substitute. Everything it leaves
						    out — the full description, the specification table, the
						    options — is one click away and named as such. */}
						{product && (
							<Link
								href={{ pathname: "/products/[slug]", params: { slug: product.slug } }}
								onClick={() => onOpenChange(false)}
								className="text-primary mt-auto text-sm underline underline-offset-4"
							>
								{t("viewFullDetails")}
							</Link>
						)}
					</div>
				</div>
			</DialogContent>
		</Dialog>
	)
}

export default QuickViewDialog
