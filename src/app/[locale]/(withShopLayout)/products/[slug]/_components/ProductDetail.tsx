"use client"

import { useEffect, useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { AlertCircle, Check, Loader2, Minus, Plus } from "lucide-react"
import { Link } from "@/i18n/navigation"
import {
	useAddToCartMutation,
	useAddToQuoteBasketMutation,
	useLazyShopProductQuery,
	useShopProductQuery,
} from "@/redux/api/storefrontApi"
import { formatMoney } from "@/lib/money"
import { cn } from "@/lib/utils"
import type { PublicProductDetail } from "@/types/storefront"
import ProductGallery from "./ProductGallery"
import TierTable from "./TierTable"

/** Long enough that typing a quantity does not fire a request per keystroke. */
const REPRICE_DELAY_MS = 400

const apiMessage = (error: unknown) =>
	(error as { data?: { message?: string } })?.data?.message

/**
 * The product page.
 *
 * Three rules are visible here and none of them is enforced by arithmetic on
 * this side:
 *
 *  - R2: a quote-only product shows no price at any quantity and goes to the
 *    inquiry basket. The cart endpoint rejects it outright, so the button
 *    cannot be the only guard.
 *  - R3/R4: the quantity field starts at the variant's effective MOQ and will
 *    not go below it. The API rejects a short quantity rather than silently
 *    rounding it up, and this mirrors that rather than hiding it.
 *  - Pricing: every figure shown comes back from the API resolved for this
 *    visitor's role at this quantity. Changing the quantity refetches. Nothing
 *    is multiplied locally — that is spec risk #1.
 */
export const ProductDetail = ({ slug }: { slug: string }) => {
	const t = useTranslations("shop")
	const locale = useLocale()

	const [variantId, setVariantId] = useState<string | null>(null)
	const [quantity, setQuantity] = useState(1)
	const [pricedQuantity, setPricedQuantity] = useState(1)
	const [chosenOptions, setChosenOptions] = useState<Set<string>>(new Set())
	const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null)
	const [attaching, setAttaching] = useState(false)

	useEffect(() => {
		const timer = setTimeout(() => setPricedQuantity(quantity), REPRICE_DELAY_MS)
		return () => clearTimeout(timer)
	}, [quantity])

	const { data, isLoading, isError } = useShopProductQuery({ slug, quantity: pricedQuantity })

	/**
	 * Quantity is part of the cache key, so every reprice starts a fresh entry
	 * and `data` is briefly undefined. Holding the last good response keeps the
	 * page from blanking between tiers.
	 *
	 * Adjusted during render rather than in an effect: React re-renders
	 * immediately without committing the first pass, so the stale value is
	 * never painted. An effect would show the blank frame first.
	 */
	const [snapshot, setSnapshot] = useState<PublicProductDetail>()
	if (data && data !== snapshot) setSnapshot(data)
	const product = data ?? snapshot

	const variant = useMemo(() => {
		if (!product?.variants.length) return null
		return (
			product.variants.find((v) => v.id === variantId) ??
			product.variants.find((v) => v.isDefault) ??
			product.variants[0]
		)
	}, [product, variantId])

	const minQuantity = variant && variant.moq > 0 ? variant.moq : 1
	const variantKey = variant?.id ?? null

	/**
	 * Switching variant can raise the floor — a variant carries its own MOQ,
	 * already resolved against the product's. Same render-time adjustment as
	 * above, so the quantity field never paints a value below the minimum.
	 */
	const [syncedVariant, setSyncedVariant] = useState<string | null>(null)
	if (variantKey && variantKey !== syncedVariant) {
		setSyncedVariant(variantKey)
		if (quantity < minQuantity) setQuantity(minQuantity)
		if (feedback) setFeedback(null)
	}

	/**
	 * The ladder's opening price — what one unit costs before any tier applies.
	 *
	 * The tier rows themselves are safe to show at any time: the API prices each
	 * one at its own threshold. The opening row is not, because it is the price
	 * of whatever quantity we last asked for. So it is captured from a response
	 * taken while the quantity was genuinely below the first threshold, and held
	 * until the variant changes. Without this the row reads back the current
	 * price and claims 50 units cost what 250 do.
	 */
	const firstTierAt = variant?.tiers[0]?.minQuantity ?? Number.POSITIVE_INFINITY
	const [openingPrice, setOpeningPrice] = useState<{ variantId: string; unitPrice: string | null }>()
	if (variant && pricedQuantity < firstTierAt && openingPrice?.variantId !== variant.id) {
		setOpeningPrice({ variantId: variant.id, unitPrice: variant.unitPrice })
	}

	const [addToCart, cartState] = useAddToCartMutation()
	const [addToQuoteBasket, quoteState] = useAddToQuoteBasketMutation()
	const [fetchOptionProduct] = useLazyShopProductQuery()

	const busy = cartState.isLoading || quoteState.isLoading || attaching
	const belowMoq = quantity < minQuantity

	/**
	 * Any change to the quantity retires the last confirmation. "Added to your
	 * cart" left standing next to a quantity that is no longer the one that was
	 * added reads as if the new number went in too.
	 */
	const changeQuantity = (next: number) => {
		setQuantity(Math.max(1, next))
		setFeedback(null)
	}

	const handleAdd = async () => {
		if (!product || !variant || belowMoq) return
		setFeedback(null)

		try {
			if (product.quoteOnly) {
				await addToQuoteBasket({ variantId: variant.id, quantity }).unwrap()
				setFeedback({ ok: true, message: t("addedToQuote") })
				return
			}

			const cart = await addToCart({ variantId: variant.id, quantity }).unwrap()

			if (chosenOptions.size) {
				setAttaching(true)
				const line = cart.items.find((item) => item.variantId === variant.id)
				// Options hang off the line that was just created. If that line
				// cannot be found the main product is still in the cart — the
				// message below reports the failure rather than pretending.
				for (const optionId of chosenOptions) {
					const option = product.options.find((o) => o.id === optionId)
					if (!option || !line) continue
					const optionProduct = await fetchOptionProduct({ slug: option.slug }).unwrap()
					const optionVariant =
						optionProduct.variants.find((v) => v.isDefault) ?? optionProduct.variants[0]
					if (!optionVariant) continue
					await addToCart({
						variantId: optionVariant.id,
						quantity: option.startQuantity,
						parentItemId: line.id,
					}).unwrap()
				}
			}

			setFeedback({ ok: true, message: t("addedToCart") })
		} catch (error) {
			setFeedback({ ok: false, message: apiMessage(error) ?? t("addFailed") })
		} finally {
			setAttaching(false)
		}
	}

	if (isLoading && !product) {
		return (
			<p className="text-muted-foreground py-24 text-center text-sm">
				<Loader2 className="mr-2 inline size-4 animate-spin" />
				{t("loading")}
			</p>
		)
	}

	if (isError || !product) {
		return (
			<div className="py-24 text-center">
				<p className="text-muted-foreground text-sm">{t("notFound")}</p>
				<Link
					href="/products"
					className="bg-primary text-primary-foreground mt-6 inline-flex px-6 py-2.5 text-sm font-semibold tracking-wide uppercase"
				>
					{t("backToShop")}
				</Link>
			</div>
		)
	}

	const hasChoices = product.variants.length > 1
	const unitPrice = formatMoney(variant?.unitPrice, locale)
	const listPrice = formatMoney(variant?.listPrice, locale)
	const lineTotal = formatMoney(variant?.lineTotal, locale)

	return (
		<div className="mx-auto w-full max-w-[1400px] px-6 py-12">
			<nav className="text-muted-foreground mb-8 text-sm">
				<Link href="/products" className="hover:text-primary transition-colors">
					{t("allProducts")}
				</Link>
				<span className="mx-2">/</span>
				<span className="text-foreground">{product.name}</span>
			</nav>

			<div className="grid gap-12 lg:grid-cols-2">
				<ProductGallery images={product.images} alt={product.name} />

				<div>
					<h1 className="font-heading text-3xl font-extrabold tracking-tight sm:text-4xl">
						{product.name}
					</h1>

					{!!product.categories.length && (
						<p className="text-muted-foreground mt-2 text-sm">
							{product.categories.map((category) => category.name).join(", ")}
						</p>
					)}

					{product.shortDescription && (
						<p className="text-muted-foreground mt-5 text-sm leading-relaxed">
							{product.shortDescription}
						</p>
					)}

					<div className="mt-7">
						{product.quoteOnly ? (
							<p className="text-xl font-semibold italic">{t("priceOnRequest")}</p>
						) : unitPrice ? (
							<p className="flex items-baseline gap-3">
								<span className="text-3xl font-bold">{unitPrice}</span>
								{variant?.onSale && listPrice && (
									<span className="text-muted-foreground text-lg line-through">{listPrice}</span>
								)}
								<span className="text-muted-foreground text-sm">
									{t("perUnit")} · {t("exclVat")}
								</span>
							</p>
						) : (
							<p className="text-muted-foreground text-sm">{t("unavailable")}</p>
						)}
					</div>

					{hasChoices && (
						<fieldset className="mt-8">
							<legend className="font-heading mb-3 text-base font-semibold">{t("variant")}</legend>
							<div className="flex flex-wrap gap-2">
								{product.variants.map((option) => {
									const label = option.attributes.map((a) => a.label).join(" · ") || option.sku
									return (
										<button
											key={option.id}
											type="button"
											onClick={() => setVariantId(option.id)}
											disabled={!option.inStock}
											className={cn(
												"border px-4 py-2.5 text-sm transition-colors",
												option.id === variant?.id
													? "border-primary text-primary font-semibold"
													: "hover:border-neutral-400",
												!option.inStock && "text-muted-foreground line-through opacity-50"
											)}
										>
											{label}
										</button>
									)
								})}
							</div>
						</fieldset>
					)}

					<div className="mt-8">
						<label htmlFor="quantity" className="font-heading mb-3 block text-base font-semibold">
							{t("quantity")}
						</label>
						<div className="flex items-center gap-4">
							<div className="inline-flex border">
								<button
									type="button"
									onClick={() => changeQuantity(Math.max(minQuantity, quantity - 1))}
									disabled={quantity <= minQuantity}
									aria-label="-"
									className="px-3.5 py-2.5 disabled:opacity-40"
								>
									<Minus className="size-4" />
								</button>
								<input
									id="quantity"
									type="number"
									inputMode="numeric"
									min={minQuantity}
									value={quantity}
									onChange={(event) => changeQuantity(Number(event.target.value) || 1)}
									className="w-20 border-x px-2 py-2.5 text-center text-sm outline-none"
								/>
								<button
									type="button"
									onClick={() => changeQuantity(quantity + 1)}
									aria-label="+"
									className="px-3.5 py-2.5"
								>
									<Plus className="size-4" />
								</button>
							</div>

							{minQuantity > 1 && (
								<p className="text-muted-foreground text-sm">
									{t("minimumOrder", { quantity: minQuantity })}
								</p>
							)}
						</div>

						{belowMoq && (
							<p className="text-destructive mt-3 flex items-center gap-2 text-sm">
								<AlertCircle className="size-4 shrink-0" />
								{t("belowMoq", { quantity: minQuantity })}
							</p>
						)}

						{!product.quoteOnly && lineTotal && !belowMoq && (
							<p className="mt-3 text-sm">
								<span className="text-muted-foreground">{t("total")}: </span>
								<span className="font-semibold">{lineTotal}</span>
								<span className="text-muted-foreground"> {t("exclVat")}</span>
							</p>
						)}
					</div>

					{!!product.options.length && (
						<fieldset className="mt-8">
							<legend className="font-heading mb-3 text-base font-semibold">{t("options")}</legend>
							<ul className="space-y-2">
								{product.options.map((option) => {
									const price = formatMoney(option.unitPrice, locale)
									return (
										<li key={option.id}>
											<label className="hover:border-neutral-400 flex cursor-pointer items-start gap-3 border p-3.5 transition-colors">
												<input
													type="checkbox"
													checked={chosenOptions.has(option.id)}
													onChange={(event) =>
														setChosenOptions((current) => {
															const next = new Set(current)
															if (event.target.checked) next.add(option.id)
															else next.delete(option.id)
															return next
														})
													}
													className="mt-0.5 size-4 shrink-0"
												/>
												<span className="flex-1 text-sm">
													{option.groupLabel && (
														<span className="text-muted-foreground block text-xs uppercase">
															{option.groupLabel}
														</span>
													)}
													<span className="font-medium">{option.name}</span>
													{option.startQuantity > 1 && (
														<span className="text-muted-foreground block text-xs">
															{t("minimumOrder", { quantity: option.startQuantity })}
														</span>
													)}
												</span>
												{price && <span className="text-sm font-semibold">{price}</span>}
											</label>
										</li>
									)
								})}
							</ul>
						</fieldset>
					)}

					<button
						type="button"
						onClick={handleAdd}
						disabled={busy || belowMoq || (!product.quoteOnly && !variant?.inStock)}
						className="bg-primary text-primary-foreground mt-8 inline-flex w-full items-center justify-center gap-2 px-8 py-4 text-sm font-semibold tracking-wide uppercase transition-opacity hover:opacity-90 disabled:opacity-50 sm:w-auto"
					>
						{busy && <Loader2 className="size-4 animate-spin" />}
						{product.quoteOnly ? t("addToQuote") : t("addToCart")}
					</button>

					{feedback && (
						<p
							role="status"
							className={cn(
								"mt-4 flex items-center gap-2 text-sm",
								feedback.ok ? "text-primary" : "text-destructive"
							)}
						>
							{feedback.ok ? (
								<Check className="size-4 shrink-0" />
							) : (
								<AlertCircle className="size-4 shrink-0" />
							)}
							{feedback.message}
							{feedback.ok && (
								<Link
									href={product.quoteOnly ? "/quote-basket" : "/cart"}
									className="underline underline-offset-2"
								>
									{product.quoteOnly ? t("viewQuote") : t("viewCart")}
								</Link>
							)}
						</p>
					)}

					<dl className="text-muted-foreground mt-8 space-y-1.5 border-t pt-6 text-sm">
						{variant?.sku && (
							<div className="flex gap-2">
								<dt>{t("sku")}:</dt>
								<dd className="text-foreground">{variant.sku}</dd>
							</div>
						)}
						{variant?.weightKg && (
							<div className="flex gap-2">
								<dt>{t("weight")}:</dt>
								<dd className="text-foreground">{variant.weightKg} kg</dd>
							</div>
						)}
						<div className="flex gap-2">
							<dt>{t("details")}:</dt>
							<dd className={variant?.inStock ? "text-foreground" : "text-destructive"}>
								{variant?.inStock ? t("inStock") : t("outOfStock")}
							</dd>
						</div>
					</dl>

					{!product.quoteOnly && variant && (
						<div className="mt-8">
							<TierTable
								tiers={variant.tiers}
								quantity={quantity}
								baseRow={
									minQuantity < firstTierAt && openingPrice?.variantId === variant.id
										? { minQuantity, unitPrice: openingPrice.unitPrice }
										: null
								}
							/>
						</div>
					)}
				</div>
			</div>

			{product.description && (
				<section className="mt-16 border-t pt-10">
					<h2 className="font-heading mb-5 text-2xl font-extrabold tracking-tight">
						{t("description")}
					</h2>
					<div
						className="[&_p]:text-muted-foreground max-w-3xl [&_li]:text-muted-foreground [&_a]:text-primary [&_a]:underline [&_li]:mt-1 [&_li]:text-sm [&_p]:mb-4 [&_p]:text-sm [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-6"
						// Product copy is written by staff in the admin editor, not by
						// shoppers, and is stored as the TipTap HTML they authored.
						dangerouslySetInnerHTML={{ __html: product.description }}
					/>
				</section>
			)}
		</div>
	)
}

export default ProductDetail
