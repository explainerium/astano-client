"use client"

import { useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Loader2, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Link } from "@/i18n/navigation"
import {
	useAddToCartMutation,
	useRemoveFromWishlistMutation,
	useWishlistQuery,
} from "@/redux/api/storefrontApi"
import { formatDate } from "@/lib/dates"
import useMoney from "@/lib/useMoney"
import { cn } from "@/lib/utils"

const apiMessage = (error: unknown) => (error as { data?: { message?: string } })?.data?.message

/**
 * The wishlist.
 *
 * Prices are resolved live by the API, not stored when the item was saved — a
 * list kept for months must not quote a price from the day it was added.
 *
 * Unavailable entries stay visible rather than disappearing: a customer who
 * saved something needs to be told it is gone, not left wondering where it
 * went.
 */
export const WishlistView = () => {
	// The shop's own separators and symbol. A function rather than an import,
	// so React Compiler can see that these prices depend on it.
	const formatMoney = useMoney()

	const t = useTranslations("account")
	const locale = useLocale()

	const { data: wishlist, isLoading } = useWishlistQuery()
	const [removeItem, { isLoading: isRemoving }] = useRemoveFromWishlistMutation()
	const [addToCart] = useAddToCartMutation()
	const [busyId, setBusyId] = useState<string | null>(null)

	if (isLoading) {
		return (
			<p className="text-muted-foreground py-16 text-center text-sm">
				<Loader2 className="mr-2 inline size-4 animate-spin" />…
			</p>
		)
	}

	if (!wishlist?.items.length) {
		return (
			<div className="py-16 text-center">
				<p className="text-muted-foreground text-sm">{t("noWishlist")}</p>
				<Link
					href="/products"
					className="bg-primary text-primary-foreground mt-6 inline-flex px-7 py-3 text-sm font-semibold tracking-wide uppercase"
				>
					{t("startShopping")}
				</Link>
			</div>
		)
	}

	const add = async (variantId: string, moq: number) => {
		setBusyId(variantId)
		try {
			await addToCart({ variantId, quantity: Math.max(moq, 1) }).unwrap()
			toast.success(t("addedToCart"))
		} catch (error) {
			toast.error(apiMessage(error) ?? t("addFailed"))
		} finally {
			setBusyId(null)
		}
	}

	return (
		<ul className="divide-y border-y">
			{wishlist.items.map((item) => (
				<li key={item.id} className={cn("flex gap-5 py-5", !item.available && "opacity-60")}>
					<Link
						href={{ pathname: "/products/[slug]", params: { slug: item.slug } }}
						className="bg-muted size-24 shrink-0 overflow-hidden"
					>
						{item.image ? (
							// eslint-disable-next-line @next/next/no-img-element
							<img
								src={item.image.url}
								alt={item.name}
								loading="lazy"
								className="size-full object-contain"
							/>
						) : null}
					</Link>

					<div className="min-w-0 flex-1">
						<Link
							href={{ pathname: "/products/[slug]", params: { slug: item.slug } }}
							className="hover:text-primary font-medium transition-colors"
						>
							{item.name}
						</Link>
						{item.sku && <p className="text-muted-foreground text-xs">{item.sku}</p>}
						<p className="text-muted-foreground mt-0.5 text-xs">
							{t("addedOn", { date: formatDate(item.addedAt, locale) ?? "" })}
						</p>

						<p className="mt-2 text-sm">
							{item.quoteOnly ? (
								<span className="text-muted-foreground italic">{t("priceOnRequest")}</span>
							) : item.unitPrice ? (
								<span className="font-semibold">{formatMoney(item.unitPrice)}</span>
							) : null}
						</p>

						{!item.available && (
							<p className="text-destructive mt-1 text-sm">{t("unavailable")}</p>
						)}
						{item.available && !item.inStock && (
							<p className="text-destructive mt-1 text-sm">{t("outOfStock")}</p>
						)}
					</div>

					<div className="flex shrink-0 flex-col items-end gap-3">
						{item.quoteOnly ? (
							<Link
								href="/quote-basket"
								className="bg-primary text-primary-foreground px-5 py-2.5 text-xs font-semibold tracking-wide uppercase transition-opacity hover:opacity-90"
							>
								{t("addToQuote")}
							</Link>
						) : (
							<button
								type="button"
								disabled={!item.available || !item.inStock || busyId === item.variantId}
								onClick={() => add(item.variantId, item.moq)}
								className="bg-primary text-primary-foreground inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold tracking-wide uppercase transition-opacity hover:opacity-90 disabled:opacity-50"
							>
								{busyId === item.variantId && <Loader2 className="size-3.5 animate-spin" />}
								{t("addToCart")}
							</button>
						)}

						<button
							type="button"
							disabled={isRemoving}
							onClick={() => removeItem(item.variantId)}
							className="text-muted-foreground hover:text-destructive inline-flex items-center gap-1.5 text-sm transition-colors"
						>
							<Trash2 className="size-4" />
							{t("removeFromWishlist")}
						</button>
					</div>
				</li>
			))}
		</ul>
	)
}

export default WishlistView
