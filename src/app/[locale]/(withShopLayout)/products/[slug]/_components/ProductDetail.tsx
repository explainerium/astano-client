"use client"

import { useEffect, useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import {
	AlertCircle,
	ChevronDown,
	Check,
	Info,
	Loader2,
	Minus,
	Package,
	Plus,
	SquareArrowOutUpRight,
} from "lucide-react"
import { Link, useRouter } from "@/i18n/navigation"
import AddedToCartDialog from "@/components/shared/AddedToCartDialog"
import {
	useAddConfigurationToCartMutation,
	useAddToCartMutation,
	useAddToQuoteBasketMutation,
	usePriceConfigurationMutation,
	useShopProductQuery,
} from "@/redux/api/storefrontApi"
import useMoney from "@/lib/useMoney"
import { formatWeight, weightUnitOf } from "@/lib/units"
import { usePublicSettingsQuery } from "@/redux/api/settingApi"
import { cn } from "@/lib/utils"
import type { ConfiguredBundle, PublicProductDetail } from "@/types/storefront"
import ProductGallery from "./ProductGallery"
import ProductTabs from "./ProductTabs"
import TierTable from "./TierTable"

/**
 * The configurator's accent, and only the configurator's.
 *
 * #FF4D00 is what the WordPress site used for this section — the notice above
 * the grid, the section title, and the ribbon on the main product. Customers
 * told us they could no longer find the options area; this is the colour they
 * were looking for.
 *
 * Deliberately not `--primary`: the cyan is the shop's identity and marks what
 * to press. This marks one section of one page.
 *
 * Written out as whole class names rather than through a CSS variable. The
 * `text-(--var)` shorthand generated a rule for some of these utilities and
 * silently none for others, so the heading turned orange and the selected row
 * did not — a failure that looks like a styling opinion rather than a bug.
 */
const ACCENT = {
	text: "text-[#ff4d00]",
	border: "border-[#ff4d00]",
	bg: "bg-[#ff4d00]",
	soft: "bg-[#fff4ef]",
	softBorder: "border-[#ffd0bd]",
} as const

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
	/**
	 * The configurator, folded away once the customer is done with it.
	 *
	 * Open to begin with. The largest bundle in the catalogue carries
	 * twenty-four options and folding it away is a real relief — but it is still
	 * how this product is bought, and a shop that opens with its configurator
	 * closed has hidden the wrong section.
	 *
	 * Declared with the other hooks rather than beside the markup that uses it:
	 * the render path returns early while the product is loading, and a hook
	 * after that returns on some renders and not others.
	 */
	const [optionsOpen, setOptionsOpen] = useState(true)
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
	const [addConfigurationToCart, configureState] = useAddConfigurationToCartMutation()
	const [addToQuoteBasket, quoteState] = useAddToQuoteBasketMutation()

	const busy =
		cartState.isLoading || configureState.isLoading || quoteState.isLoading || attaching
	const belowMoq = quantity < minQuantity

	/**
	 * The unit price the API resolved for this option at this quantity.
	 *
	 * A lookup, not a calculation: every rung was priced by the server at its own
	 * threshold, so this only picks the one the quantity has reached. Shown for
	 * options nobody has ticked yet, where there is no configuration to price.
	 */
	const unitPriceFor = (option: PublicProductDetail["options"][number], units: number) => {
		const rung = option.tiers.reduce<{ unitPrice: string | null } | null>(
			(best, tier) => (units >= tier.minQuantity ? tier : best),
			null
		)
		return rung?.unitPrice ?? option.unitPrice
	}

	/**
	 * The configuration as the API takes it — variant ids and quantities.
	 *
	 * Quantities are floored at each option's own minimum, which is the floor the
	 * server applies too, so the figure quoted is the figure the cart will hold.
	 * An option product with no active variant cannot be bought at all and never
	 * reaches here.
	 */
	const selection = useMemo(
		() =>
			[...chosenOptions].flatMap(([id, units]) => {
				const option = product?.options.find((o) => o.id === id)
				if (!option?.variantId) return []
				return [{ variantId: option.variantId, quantity: Math.max(units, option.startQuantity) }]
			}),
		[chosenOptions, product]
	)

	/**
	 * What the whole configuration costs, answered by the API.
	 *
	 * This page used to add it up itself, in `Number`, from the rungs embedded in
	 * the product payload — which skipped the bundle discount a product may offer
	 * on an option, ignored any ladder negotiated with this customer, and did
	 * binary floating-point arithmetic on money. The configurator quoted one
	 * figure and the cart then charged another. Now every number below comes back
	 * from `resolvePrice`, the same function the cart and the invoice call.
	 */
	const [priceConfiguration] = usePriceConfigurationMutation()
	const [configured, setConfigured] = useState<ConfiguredBundle | null>(null)

	useEffect(() => {
		if (!variant || !product?.options.length) return

		let cancelled = false

		// Debounced for the same reason the quantity refetch is: ticking through
		// six options should not be six round trips.
		const timer = setTimeout(() => {
			void priceConfiguration({ variantId: variant.id, quantity, options: selection })
				.unwrap()
				.then((result) => {
					if (!cancelled) setConfigured(result)
				})
				.catch(() => {
					// A failed reprice leaves the last good figures on screen rather
					// than blanking the box the customer is reading.
				})
		}, REPRICE_DELAY_MS)

		return () => {
			cancelled = true
			clearTimeout(timer)
		}
	}, [variant, quantity, selection, product?.options.length, priceConfiguration])

	/** What the API says one ticked option comes to. Null until it has answered. */
	const configuredOptionTotal = (option: PublicProductDetail["options"][number]) =>
		configured?.options.find((line) => line.variantId === option.variantId)?.lineTotal ?? null

	/**
	 * An option under its own minimum blocks the whole add, not just itself.
	 *
	 * The alternative is adding the main product and failing on the option, which
	 * leaves a half-built configuration in the cart — worse than refusing and
	 * saying which line is short. Checked here for an immediate answer; the API
	 * refuses the same configuration regardless, which is what actually protects
	 * the rule.
	 */
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

			/*
			 * One request for the whole configuration, or one for the article.
			 *
			 * This used to post the article and then loop over the options posting
			 * one at a time, fetching each option's product first to learn its
			 * variant. Six options meant thirteen round trips, and a failure part
			 * way through left a cutter in the cart without its engraving — which
			 * is not a smaller order but the wrong one. `/configure/add-to-cart`
			 * writes every line in one transaction, or none of them, and checks
			 * server-side that each option is genuinely offered with this product.
			 */
			if (withOptions && selection.length) {
				setAttaching(true)
				await addConfigurationToCart({
					variantId: variant.id,
					quantity,
					options: selection,
				}).unwrap()
			} else {
				await addToCart({ variantId: variant.id, quantity }).unwrap()
			}

			setAdded({
				name: product.name,
				image: product.featuredImage?.srcset.thumb ?? product.featuredImage?.url ?? null,
				quantity,
				quote: false,
			})

			// After the whole configuration has landed, not before: leaving mid-way
			// would take the customer to a cart still missing half of what they
			// picked.
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
			// The configuration's own figure for the article once options are
			// priced, and the plain one until they are.
			total: formatMoney(configured?.main.lineTotal) ?? lineTotal,
		},
		...[...chosenOptions].flatMap(([id, units]) => {
			const option = product.options.find((o) => o.id === id)
			if (!option) return []
			return [
				{
					id: option.id,
					name: option.name,
					// The floor the server applies, so this is the quantity that will
					// actually be ordered rather than the one that was typed.
					quantity: Math.max(units, option.startQuantity),
					total: formatMoney(configuredOptionTotal(option)),
				},
			]
		}),
	]

	/**
	 * The subtotal, straight from the API.
	 *
	 * Not `main + options` added up here: a bundle discount and any ladder
	 * negotiated with this customer are already inside these figures, and the
	 * only way to be sure this total matches the cart is not to compute it.
	 */
	const configuredTotal = configured?.subtotal ?? null

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
					{formatMoney(configuredTotal) ?? "—"}
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
	/**
	 * What an option product offers instead of a purchase.
	 *
	 * It cannot be ordered on its own — it is bought by being ticked on the page
	 * of the product it belongs to. So the quantity field, the line total and the
	 * add-to-cart button are all absent rather than disabled: a greyed-out Buy
	 * button says "not right now", and the truthful answer is "not here, and not
	 * ever, and here is where instead".
	 *
	 * Everything else on the page stays. The photographs, the description, the
	 * specification and the tier ladder are the entire reason this page is worth
	 * opening, and are what the configurator's Details link came for.
	 */
	const optionOnlyNote = (
		<div className={cn("mt-8 flex gap-3 rounded-lg border p-4 text-sm", ACCENT.softBorder, ACCENT.soft, ACCENT.text)}>
			<Info className="mt-0.5 shrink-0" />
			<div className="space-y-1">
				<p className="font-medium">{t("optionProductTitle")}</p>
				<p>{t("optionProductBody")}</p>
			</div>
		</div>
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

					{/*
					 * Absent counts as purchasable.
					 *
					 * The two repositories deploy separately, so there is a window
					 * where this page is running against an API that predates the
					 * field. Read as falsy it would hide the buy button on every
					 * product in the shop; read this way the worst case is a buy
					 * button on the handful of option pages, where the request is
					 * refused anyway.
					 */}
					{product.purchasableAlone === false ? optionOnlyNote : buyBox}

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
					{/*
					 * A heading that collapses the configurator.
					 *
					 * Twenty-four options is the largest bundle in the catalogue, and a
					 * customer who has finished configuring — or who came for the
					 * description and the tier table below — should be able to fold it
					 * away rather than scroll past it twice. Open by default: this is
					 * the configurator, not an aside, and a shop that hides how to buy
					 * the thing has hidden the wrong section.
					 */}
					{/*
					 * A solid bar, not a coloured heading.
					 *
					 * Orange type on white read as a styled title and nothing more —
					 * the section still did not announce itself, which was the whole
					 * complaint. A filled bar is a piece of furniture: it separates
					 * this section from the description above it and is findable at a
					 * glance from anywhere on the page.
					 */}
					<div
						className={cn(
							// Rounded all round, not joined to what follows: the section
							// below it folds away, and a bar with square bottom corners
							// sitting over nothing looks like something failed to load.
							"flex flex-wrap items-center gap-3 rounded-lg px-5 py-3.5 text-white",
							ACCENT.bg
						)}
					>
						<h2 className="font-heading text-base font-semibold">{t("optionsTitle")}</h2>

						{/*
						 * The count, and how loudly it is said.
						 *
						 * A tally of choices already made deserves to be legible at a
						 * glance — it is the reason the section can be folded away at
						 * all. Translucent white was the first attempt and it dissolved
						 * into the orange behind it; a solid white pill with the bar's
						 * own colour inside it is the one combination on this bar that
						 * cannot be missed.
						 *
						 * Only once there is something to count. Empty, it stays
						 * translucent: "none selected" is a state, not news.
						 */}
						<span
							className={cn(
								"rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors duration-200",
								chosenOptions.size
									? cn("bg-white font-semibold", ACCENT.text)
									: "bg-white/20 text-white/85"
							)}
						>
							{t("optionsSelectedCount", { count: chosenOptions.size })}
						</span>

						<button
							type="button"
							onClick={() => setOptionsOpen((open) => !open)}
							aria-expanded={optionsOpen}
							aria-controls="product-options"
							className="ml-auto inline-flex items-center gap-1.5 text-sm text-white/90 transition-colors duration-200 hover:text-white motion-reduce:transition-none"
						>
							{optionsOpen ? t("optionsHide") : t("optionsShow")}
							<ChevronDown
								className={cn(
									"size-4 transition-transform duration-300 ease-out motion-reduce:transition-none",
									optionsOpen && "rotate-180"
								)}
							/>
						</button>
					</div>

					<div
						id="product-options"
						className={cn(
							"grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none",
							optionsOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
						)}
					>
					<div className="overflow-hidden">
					<fieldset className="mt-6">
						<legend className="sr-only">{t("options")}</legend>

						{/*
						 * What this section is, and the one thing about it that is not
						 * obvious.
						 *
						 * The tier sentence is carried over from the WordPress
						 * configurator, which said it in exactly these terms — an option's
						 * unit price falls once the quantity reaches its next rung, and a
						 * customer who does not know that reads the first figure as the
						 * only figure. Amber because it is guidance rather than a warning;
						 * the red one below is for a quantity that is actually wrong.
						 */}
						<div className={cn("mb-5 flex gap-3 rounded-lg border p-4 text-sm", ACCENT.softBorder, ACCENT.soft, ACCENT.text)}>
							<Info className="mt-0.5 shrink-0" />
							<div className="space-y-1.5">
								<p>{t("optionsIntro")}</p>
								<p className="font-medium">{t("optionsTierHint")}</p>
							</div>
						</div>
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
											// Amber for the chosen state, matching the notice above and
											// the tally in the heading — the whole configurator speaks
											// one colour, and it is not the page's buy-button accent.
											"overflow-hidden border transition-[border-color,background-color,box-shadow] duration-200 ease-out motion-reduce:transition-none",
											chosen
												// A left edge rather than an inset shadow: `theme()` inside
												// an arbitrary value is Tailwind 3 syntax and silently
												// produces nothing under 4, so the marker was invisible while
												// the class sat in the markup looking correct.
												? cn("border-l-4", ACCENT.border, ACCENT.soft)
												: "hover:border-neutral-400 hover:shadow-sm"
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
												className="shrink-0"
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
													className="size-16 shrink-0 border bg-white object-cover"
												/>
											) : (
												<span className="bg-muted text-muted-foreground flex size-16 shrink-0 items-center justify-center border">
													<Package className="size-6" />
												</span>
											)}

											<span className="min-w-0 flex-1">
												{option.groupLabel && (
													<span className="text-muted-foreground block text-[11px] tracking-wide uppercase">
														{option.groupLabel}
													</span>
												)}
												<span className="block text-sm font-medium">{option.name}</span>

												{/*
												 * Through to the option's own page.
												 *
												 * Every option is a real product with its own
												 * photographs, description and tier table — the
												 * configurator can only show a line of it, and
												 * "Lasergravur auf Metallbox" is not a description of
												 * anything to somebody deciding whether they want it.
												 *
												 * A new tab, and a click that does not reach the label:
												 * this sits inside the row that ticks the checkbox, so
												 * without stopPropagation reading about an option would
												 * also select it — and navigating away in this tab
												 * would throw away everything configured so far.
												 */}
												<Link
													href={{ pathname: "/products/[slug]", params: { slug: option.slug } }}
													target="_blank"
													rel="noreferrer"
													onClick={(event) => event.stopPropagation()}
													aria-label={t("optionMoreInfoLabel", { name: option.name })}
													className="text-muted-foreground hover:text-primary mt-0.5 inline-flex items-center gap-1 text-xs underline underline-offset-2 transition-colors duration-200 motion-reduce:transition-none"
												>
													{t("optionMoreInfo")}
													<SquareArrowOutUpRight className="size-3" />
												</Link>
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

														{/* A ticked option shows what the API says the line comes
														    to; an untouched one shows the unit price it resolved,
														    because there is no configuration to price yet. */}
														{chosen
															? formatMoney(configuredOptionTotal(option)) && (
																	<span className="text-muted-foreground ml-auto text-xs">
																		{t("total")}:{" "}
																		<span className="text-foreground font-semibold">
																			{formatMoney(configuredOptionTotal(option))}
																		</span>
																	</span>
																)
															: formatMoney(unitPriceFor(option, optionQuantity)) && (
																	<span className="text-muted-foreground ml-auto text-xs">
																		<span className="text-foreground font-semibold">
																			{formatMoney(unitPriceFor(option, optionQuantity))}
																		</span>{" "}
																		{t("perUnit")}
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
					</div>
					</div>

					{/*
					 * The order box.
					 *
					 * Outside the collapse on purpose: folding the options away is about
					 * getting the list off the screen, and taking the total and the buy
					 * button with it would fold away the reason the list was there.
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
