"use client"

import { useEffect, useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { AlertCircle, Check, Loader2, Minus, Package, Plus } from "lucide-react"
import { Link, useRouter } from "@/i18n/navigation"
import AddedToCartDialog from "@/components/shared/AddedToCartDialog"
import {
	useAddToCartMutation,
	useAddToQuoteBasketMutation,
	useLazyShopProductQuery,
	useShopProductQuery,
} from "@/redux/api/storefrontApi"
import useMoney from "@/lib/useMoney"
import { formatWeight, weightUnitOf } from "@/lib/units"
import { usePublicSettingsQuery } from "@/redux/api/settingApi"
import { cn } from "@/lib/utils"
import type { PublicProductDetail } from "@/types/storefront"
import ProductGallery from "./ProductGallery"
import ProductTabs from "./ProductTabs"
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
	// The shop's own separators and symbol. A function rather than an import,
	// so React Compiler can see that these prices depend on it.
	const formatMoney = useMoney()

	const t = useTranslations("shop")
	const locale = useLocale()
	const router = useRouter()

	const [variantId, setVariantId] = useState<string | null>(null)
	const [quantity, setQuantity] = useState(1)
	/// The confirmation dialog. Null while closed; holds what was added while open.
	const [added, setAdded] = useState<{
		name: string
		image: string | null
		quantity: number
		quote: boolean
	} | null>(null)
	const [pricedQuantity, setPricedQuantity] = useState(1)
	/**
	 * The chosen options and how many of each.
	 *
	 * A map rather than a set, because an option is a product bought in its own
	 * quantity: 500 cutters might carry 500 engravings or one hang-tag design.
	 * Ticking one seeds it at that option's own minimum (§4.6, R3).
	 */
	const [chosenOptions, setChosenOptions] = useState<Map<string, number>>(new Map())
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

	// Stored in kilograms; shown in the unit the shop configured.
	const { data: shopSettings } = usePublicSettingsQuery()
	const displayWeight = formatWeight(variant?.weightKg, weightUnitOf(shopSettings), locale)

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
	 * An option under its own minimum blocks the whole add, not just itself.
	 *
	 * The alternative is adding the main product and failing on the option,
	 * which leaves a half-built configuration in the cart — worse than refusing
	 * and saying which line is short.
	 */
	/**
	 * What a chosen option adds to the order.
	 *
	 * Multiplied here rather than fetched, and this is the one place the page
	 * does arithmetic on money — the *unit* price still comes from the server,
	 * already resolved for this visitor at this rung, so nothing about which
	 * price applies is decided locally.
	 */
	const lineAmountFor = (option: PublicProductDetail["options"][number], units: number) => {
		const rung = option.tiers.reduce<{ unitPrice: string | null } | null>(
			(best, tier) => (units >= tier.minQuantity ? tier : best),
			null
		)
		const unit = Number(rung?.unitPrice ?? option.unitPrice ?? Number.NaN)
		if (Number.isNaN(unit)) return null

		// Floored at the option's own minimum, the same floor `handleAdd` applies
		// when it writes the line — so the figure quoted here is the figure the
		// cart will hold, not one the API silently raises.
		return unit * Math.max(units, option.startQuantity)
	}

	const lineTotalFor = (option: PublicProductDetail["options"][number], units: number) => {
		const amount = lineAmountFor(option, units)
		return amount === null ? null : formatMoney(amount.toFixed(2))
	}

	/**
	 * What the chosen options add up to, and what the whole configuration costs.
	 *
	 * The product's own line comes from the server — it is `variant.lineTotal`,
	 * already resolved for this visitor at this quantity — and the options are
	 * summed from unit prices the server resolved too. The only arithmetic here
	 * is the addition.
	 */
	const optionsAmount = [...chosenOptions].reduce((sum, [id, units]) => {
		const option = product?.options.find((o) => o.id === id)
		const amount = option ? lineAmountFor(option, units) : null
		return sum + (amount ?? 0)
	}, 0)

	const productAmount = Number(variant?.lineTotal ?? Number.NaN)
	const configuredTotal = Number.isNaN(productAmount) ? null : productAmount + optionsAmount

	const optionBelowMoq = [...chosenOptions].some(([id, chosenQuantity]) => {
		const option = product?.options.find((o) => o.id === id)
		return !!option && chosenQuantity < option.startQuantity
	})

	/**
	 * Any change to the quantity retires the last confirmation. "Added to your
	 * cart" left standing next to a quantity that is no longer the one that was
	 * added reads as if the new number went in too.
	 */
	const changeQuantity = (next: number) => {
		setQuantity(Math.max(1, next))
		setFeedback(null)
	}

	/**
	 * Add to the cart, with or without what has been configured.
	 *
	 * Two buttons call this. The one beside the price buys the article on its
	 * own — plenty of people want the cutter and none of the packaging — and the
	 * one under the configurator buys it with everything ticked. A single button
	 * would have to guess which was meant.
	 */
	const handleAdd = async (withOptions: boolean) => {
		if (!product || !variant || belowMoq) return
		if (withOptions && optionBelowMoq) return
		setFeedback(null)

		try {
			if (product.quoteOnly) {
				await addToQuoteBasket({ variantId: variant.id, quantity }).unwrap()
				setAdded({
					name: product.name,
					image: product.featuredImage?.srcset.thumb ?? product.featuredImage?.url ?? null,
					quantity,
					quote: true,
				})
				return
			}

			const cart = await addToCart({ variantId: variant.id, quantity }).unwrap()

			if (withOptions && chosenOptions.size) {
				setAttaching(true)
				const line = cart.items.find((item) => item.variantId === variant.id)
				// Options hang off the line that was just created. If that line
				// cannot be found the main product is still in the cart — the
				// message below reports the failure rather than pretending.
				for (const [optionId, optionQuantity] of chosenOptions) {
					const option = product.options.find((o) => o.id === optionId)
					if (!option || !line) continue
					const optionProduct = await fetchOptionProduct({ slug: option.slug }).unwrap()
					const optionVariant =
						optionProduct.variants.find((v) => v.isDefault) ?? optionProduct.variants[0]
					if (!optionVariant) continue
					await addToCart({
						variantId: optionVariant.id,
						// The quantity the customer set, floored at the option's own
						// minimum — the API rejects a short line rather than quietly
						// raising it, and losing the whole basket to a typo here would
						// be a poor trade.
						quantity: Math.max(optionQuantity, option.startQuantity),
						parentItemId: line.id,
					}).unwrap()
				}
			}

			setAdded({
				name: product.name,
				image: product.featuredImage?.srcset.thumb ?? product.featuredImage?.url ?? null,
				quantity,
				quote: false,
			})

			// After the options are attached, not before: leaving mid-way would
			// take the customer to a cart still missing half of what they picked.
			if (shopSettings?.["cart.redirectAfterAdd"] === true) {
				setAdded(null)
				router.push("/cart")
			}
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
	const unitPrice = formatMoney(variant?.unitPrice)
	const listPrice = formatMoney(variant?.listPrice)
	const lineTotal = formatMoney(variant?.lineTotal)

	const hasOptions = product.options.length > 0

	/**
	 * Quantity, what it comes to, and the button.
	 * 
	 * Held as a value because it belongs in one of two places. A product with
	 * nothing to configure keeps it beside the price, where it has always been;
	 * a product with options gets it underneath them, because until the options
	 * are picked the total is not yet a number worth showing.
	 */
	/**
	 * The whole configuration: the article, everything ticked, and the sum.
	 *
	 * Itemised rather than totalled, and with the quantity on every line,
	 * because that is what is about to be written to the cart — an option is
	 * ordered in its own quantity, so a customer buying 500 cutters and 500
	 * engravings should be able to read both numbers before committing to
	 * either. The quantity of the article itself is set beside the price
	 * above; this reports it rather than offering a second control for it.
	 */
	const configuredLines = [
		{
			id: variant?.id ?? product.id,
			name: product.name,
			quantity,
			// The server's figure for this visitor at this quantity.
			total: lineTotal,
		},
		...[...chosenOptions].flatMap(([id, units]) => {
			const option = product.options.find((o) => o.id === id)
			if (!option) return []
			return [
				{
					id: option.id,
					name: option.name,
					// The floor `handleAdd` applies, so this is the quantity that
					// will actually be ordered rather than the one that was typed.
					quantity: Math.max(units, option.startQuantity),
					total: lineTotalFor(option, units),
				},
			]
		}),
	]

	const configuredBox = (
		<>
			<ul className="space-y-2 text-sm">
				{configuredLines.map((line) => (
					<li key={line.id} className="flex justify-between gap-4">
						<span className="min-w-0">
							<span className="block">{line.name}</span>
							<span className="text-muted-foreground text-xs tabular-nums">
								{t("optionQuantity")}: {line.quantity}
							</span>
						</span>
						<span className="shrink-0 tabular-nums">{line.total ?? "—"}</span>
					</li>
				))}
			</ul>

			<div className="mt-4 flex justify-between gap-4 border-t pt-3">
				<span className="font-heading text-base font-semibold">{t("total")}</span>
				<span className="text-lg font-bold tabular-nums">
					{formatMoney((configuredTotal ?? 0).toFixed(2))}
				</span>
			</div>
			<p className="text-muted-foreground text-xs">{t("exclVat")}</p>

			{optionBelowMoq && (
				<p className="text-destructive mt-3 flex items-center gap-2 text-sm">
					<AlertCircle className="size-4 shrink-0" />
					{t("optionBelowMoq")}
				</p>
			)}

			{/* Named for what it does, because there are two of these on the page
			    and the other one buys the article on its own. */}
			<button
				type="button"
				onClick={() => void handleAdd(true)}
				disabled={busy || belowMoq || optionBelowMoq || !variant?.inStock}
				className="bg-primary text-primary-foreground mt-5 inline-flex w-full items-center justify-center gap-2 px-6 py-3.5 text-xs font-semibold tracking-widest uppercase transition-opacity hover:opacity-90 disabled:opacity-50"
			>
				{busy && <Loader2 className="size-4 animate-spin" />}
				{t("addWithOptions")}
			</button>

			{feedback && !feedback.ok && (
				<p role="alert" className="text-destructive mt-3 flex items-center gap-2 text-sm">
					<AlertCircle className="size-4 shrink-0" />
					{feedback.message}
				</p>
			)}
		</>
	)
	const buyBox = (
		<>
	<div className="first:mt-0 mt-8">
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

		{/*
		 * What it comes to.
		 *
		 * Broken out once options are in play: the product on its own, what the
		 * chosen options add, and the sum. A single figure that silently included
		 * eleven extras is a number nobody can check.
		 *
		 * The product line is the server's — already priced for this visitor at
		 * this quantity — and each option's is its own resolved unit price times
		 * the quantity, floored at that option's minimum.
		 */}
		{/* This one is the article alone, so it is the article's own total. */}
		{!product.quoteOnly && lineTotal && !belowMoq && (
			<p className="mt-3 text-sm">
				<span className="text-muted-foreground">{t("total")}: </span>
				<span className="font-semibold">{lineTotal}</span>
				<span className="text-muted-foreground"> {t("exclVat")}</span>
			</p>
		)}
	</div>

	<button
		type="button"
		onClick={() => void handleAdd(false)}
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
		</>
	)

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

					{buyBox}

					<dl className="text-muted-foreground mt-8 space-y-1.5 border-t pt-6 text-sm">
						{variant?.sku && (
							<div className="flex gap-2">
								<dt>{t("sku")}:</dt>
								<dd className="text-foreground">{variant.sku}</dd>
							</div>
						)}
						{!!displayWeight && (
							<div className="flex gap-2">
								<dt>{t("weight")}:</dt>
								<dd className="text-foreground">{displayWeight}</dd>
							</div>
						)}
						<div className="flex gap-2">
							<dt>{t("details")}:</dt>
							<dd className={variant?.inStock ? "text-foreground" : "text-destructive"}>
								{variant?.inStock ? t("inStock") : t("outOfStock")}
							</dd>
						</div>
					</dl>

				</div>
			</div>

			{/*
			 * The configurator, across the whole page rather than in the column
			 * beside the gallery.
			 *
			 * Eleven options in a half-width column is a single file of cards
			 * running far below the fold. Given the page it is two readable
			 * columns, and what the configuration costs sits underneath it —
			 * which is where the decision is actually made, so that is where
			 * the quantity and the button belong too.
			 */}
			{hasOptions && (
				<section className="mt-14 border-t pt-10">
					<fieldset className="mt-8">
						<legend className="font-heading mb-3 text-base font-semibold">{t("options")}</legend>
						{/*
						 * Two across once there is room for them.
						 *
						 * A product can carry eleven options, and one per row pushed the whole
						 * configurator well below the fold — the customer scrolled past the
						 * price to reach it and past it again to get back.
						 *
						 * items-start so a row whose option is open, and has grown a quantity
						 * control, does not stretch the unopened one beside it.
						 */}
						<ul className="grid items-start gap-2 sm:grid-cols-2">
							{product.options.map((option) => {
								const chosen = chosenOptions.has(option.id)
								const optionQuantity = chosenOptions.get(option.id) ?? option.startQuantity
								const optionBelowMoq = chosen && optionQuantity < option.startQuantity

								/**
								 * What this option costs at the quantity chosen.
								 *
								 * Read off its own ladder rather than refetched: the rungs
								 * were priced by the server for this visitor, so picking the
								 * highest one the quantity reaches gives the same answer the
								 * cart will, with no request per keystroke.
								 */
								const rung = option.tiers.reduce<{ unitPrice: string | null } | null>(
									(best, tier) => (optionQuantity >= tier.minQuantity ? tier : best),
									null
								)
								const price = formatMoney(rung?.unitPrice ?? option.unitPrice)

								const setQuantityFor = (next: number) =>
									setChosenOptions((current) => {
										const map = new Map(current)
										map.set(option.id, Math.max(1, next))
										return map
									})

								return (
									<li
										key={option.id}
										className={cn(
											"overflow-hidden border transition-colors",
											chosen
												? "border-primary bg-primary/[0.03]"
												: "hover:border-neutral-400"
										)}
									>
										<label className="flex cursor-pointer items-center gap-4 p-4">
											<input
												type="checkbox"
												checked={chosen}
												onChange={(event) =>
													setChosenOptions((current) => {
														const next = new Map(current)
														// Seeded at the option's own minimum, not at 1.
														if (event.target.checked) next.set(option.id, option.startQuantity)
														else next.delete(option.id)
														return next
													})
												}
												className="accent-primary size-4 shrink-0"
											/>

											{/* A thumbnail where the option has one. An add-on is a
											    product, and packaging or a coating is far easier to
											    choose from a picture than from its name. */}
											{option.image ? (
												// eslint-disable-next-line @next/next/no-img-element
												<img
													src={option.image.srcset.thumb ?? option.image.url}
													alt=""
													loading="lazy"
													className="size-12 shrink-0 border object-cover"
												/>
											) : (
												<span className="bg-muted text-muted-foreground flex size-12 shrink-0 items-center justify-center border">
													<Package className="size-5" />
												</span>
											)}

											<span className="min-w-0 flex-1">
												{option.groupLabel && (
													<span className="text-muted-foreground block text-[11px] tracking-wide uppercase">
														{option.groupLabel}
													</span>
												)}
												<span className="block text-sm font-medium">{option.name}</span>
												{option.startQuantity > 1 && (
													<span className="text-muted-foreground block text-xs">
														{t("minimumOrder", { quantity: option.startQuantity })}
													</span>
												)}
											</span>

											<span className="shrink-0 text-right">
												{price && <span className="block text-sm font-semibold">{price}</span>}
												{/* The ladder is worth advertising before the option is
												    taken — it is the reason to take more of it. */}
												{!!option.tiers.length && (
													<span className="text-muted-foreground block text-[11px]">
														{t("fromQuantity", {
															quantity: option.tiers[0].minQuantity,
															price: formatMoney(option.tiers[0].unitPrice) ?? "",
														})}
													</span>
												)}
											</span>
										</label>

										{/*
										 * The reveal.
										 *
										 * A grid whose single row animates from 0fr to 1fr, which
										 * transitions to the content's real height without measuring
										 * it in JavaScript — `height: auto` is not animatable and a
										 * fixed max-height would either clip a long ladder or leave
										 * a pause on a short one. The inner div carries the
										 * overflow so the collapsed state hides cleanly.
										 */}
										<div
											className={cn(
												"grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none",
												chosen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
											)}
										>
											<div className="overflow-hidden">
												<div className="space-y-3 border-t px-4 py-3.5">
													<div className="flex flex-wrap items-center gap-3">
														<span className="text-muted-foreground text-xs">
															{t("optionQuantity")}
														</span>
														<div className="flex items-center border bg-white">
															<button
																type="button"
																onClick={() => setQuantityFor(optionQuantity - 1)}
																disabled={!chosen || optionQuantity <= option.startQuantity}
																className="px-3 py-1.5 disabled:opacity-40"
																aria-label="-"
															>
																<Minus className="size-3.5" />
															</button>
															<input
																type="number"
																min={option.startQuantity}
																value={optionQuantity}
																disabled={!chosen}
																onChange={(event) =>
																	setQuantityFor(Number(event.target.value) || 1)
																}
																className="w-16 border-x py-1.5 text-center text-sm outline-none"
																aria-label={`${option.name} ${t("optionQuantity")}`}
															/>
															<button
																type="button"
																onClick={() => setQuantityFor(optionQuantity + 1)}
																disabled={!chosen}
																className="px-3 py-1.5"
																aria-label="+"
															>
																<Plus className="size-3.5" />
															</button>
														</div>

														{lineTotalFor(option, optionQuantity) && (
															<span className="text-muted-foreground ml-auto text-xs">
																{t("total")}:{" "}
																<span className="text-foreground font-semibold">
																	{lineTotalFor(option, optionQuantity)}
																</span>
															</span>
														)}
													</div>

													{optionBelowMoq && (
														<p role="alert" className="text-destructive flex items-center gap-1.5 text-xs">
															<AlertCircle className="size-3.5 shrink-0" />
															{t("belowMoq", { quantity: option.startQuantity })}
														</p>
													)}

													{!!option.tiers.length && (
														<TierTable
															tiers={option.tiers}
															quantity={optionQuantity}
															baseRow={null}
															title={t("optionTiers")}
															compact
														/>
													)}
												</div>
											</div>
										</div>
									</li>
								)
							})}
						</ul>
					</fieldset>

					{/*
					 * The order box.
					 *
					 * Boxed and held to a readable width rather than left to span the page:
					 * a total whose label sits at the far left and whose figure sits 1300px
					 * away is two facts the eye has to carry between, and the sum is the one
					 * number on this page that has to be easy to check.
					 */}
					<div className="bg-muted/40 mt-10 max-w-md border p-6">{configuredBox}</div>
				</section>
			)}

			<ProductTabs product={product} variant={variant} />

			<AddedToCartDialog
				open={!!added}
				onClose={() => setAdded(null)}
				product={added}
				quote={added?.quote}
			/>
		</div>
	)
}

export default ProductDetail
