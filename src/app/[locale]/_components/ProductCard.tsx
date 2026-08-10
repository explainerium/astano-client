"use client"

import { useTranslations } from "next-intl"
import { Check, Eye, Heart, Loader2, Repeat } from "lucide-react"
import { Link } from "@/i18n/navigation"
import { useAddToWishlistMutation } from "@/redux/api/storefrontApi"
import { useAppDispatch, useAppSelector } from "@/redux/hooks"
import { toggleCompare } from "@/redux/slices/compareSlice"
import { GRID_IMAGE_SIZES, gridSrcOf, srcsetOf } from "@/lib/images"
import { cn } from "@/lib/utils"
import type { PublicProduct } from "@/types/storefront"
import useMoney from "@/lib/useMoney"

/**
 * One action in the hover rail.
 *
 * 35px square with a 14px icon, matching the live shop's own
 * `--wd-action-h: 35px` / `--wd-action-icon-size: 14px`. No border of its own —
 * the rail is a single pill and these sit inside it, which is why they are
 * separated by a hairline rather than boxed individually.
 *
 * A real button with a label: the tooltip is a nicety, the `aria-label` is what
 * makes the rail usable at all without sight or a mouse.
 */
const RailButton = ({
	label,
	active,
	busy,
	onClick,
	children,
}: {
	label: string
	active?: boolean
	busy?: boolean
	onClick: () => void
	children: React.ReactNode
}) => (
	<button
		type="button"
		onClick={onClick}
		disabled={busy}
		aria-label={label}
		aria-pressed={active}
		title={label}
		className={cn(
			"group/rail relative flex size-[35px] items-center justify-center transition-colors first:rounded-t-full last:rounded-b-full",
			active ? "text-primary" : "hover:text-primary text-neutral-700"
		)}
	>
		{busy ? <Loader2 className="size-3.5 animate-spin" /> : children}

		{/* The label, revealed beside the icon on hover. Pointer-events off so it
		    can never sit between the cursor and the button it describes. */}
		<span className="pointer-events-none absolute right-full mr-2 hidden whitespace-nowrap bg-neutral-900 px-2 py-1 text-[11px] text-white opacity-0 transition-opacity group-hover/rail:opacity-100 lg:block">
			{label}
		</span>
	</button>
)

/**
 * One product tile, matching the live grid.
 *
 * The price shown is whatever the API resolved for **this** visitor — guest,
 * retail or approved dealer — and is never recomputed here. Six surfaces
 * agreeing on a price is spec risk #1, and they agree because none of them does
 * its own arithmetic.
 *
 * A quote-only product shows "Preis auf Anfrage" and routes to the inquiry
 * basket instead of the cart (R2).
 *
 * **Every card is the same height, and that is deliberate.** The tile is a
 * flex column with the price and button pinned to the bottom, and the title is
 * clamped to two lines — the live shop does the same (`product_title_lines_limit:
 * two`). Without both, one long product name pushes its own button out of line
 * with every neighbour and the grid reads as broken.
 */
export const ProductCard = ({
	product,
	onQuickView,
}: {
	product: PublicProduct
	/** Omitted where quick view makes no sense, e.g. inside the quick view. */
	onQuickView?: (product: PublicProduct) => void
}) => {
	// The shop's own separators and symbol. A function rather than an import,
	// so React Compiler can see that these prices depend on it.
	const formatMoney = useMoney()

	const t = useTranslations("shop")
	const image = product.featuredImage

	// The second image, shown on hover, exactly as the live grid does.
	const second = product.images.find((img) => img && img.id !== image?.id) ?? null

	const dispatch = useAppDispatch()
	const compared = useAppSelector((state) => state.compare.ids.includes(product.id))

	const [addToWishlist, wishlistState] = useAddToWishlistMutation()

	return (
		// One border, the same colour whether or not the cursor is on it. The tile
		// reads as a card at rest and the grid keeps its lines; the hover feedback
		// is the action rail arriving, which is enough.
		<article className="group relative flex h-full flex-col border border-neutral-200 bg-white">
			<div className="relative">
				<Link
					href={{ pathname: "/products/[slug]", params: { slug: product.slug } }}
					/*
					 * A fixed, short window rather than a square one — a square frame is
					 * as tall as the column is wide, which on a three-across grid made
					 * every card enormous. Every tile is the same height, so a row of
					 * cards still ends level whatever shape the photographs are.
					 *
					 * `grid-rows-[minmax(0,1fr)]` is load-bearing: it stacks both images
					 * in one cell (no absolute positioning) and, because a track's
					 * automatic minimum is min-content, the `minmax(0, …)` is what lets
					 * the row shrink to the container instead of growing to the image.
					 * Without it `size-full` on the image resolves against an indefinite
					 * height and the crop does not happen.
					 */
					className="bg-muted grid h-52 grid-rows-[minmax(0,1fr)] place-items-center overflow-hidden"
					tabIndex={-1}
					aria-hidden
				>
					{image ? (
						/*
						 * `object-cover`: the photograph fills the tile whatever shape it
						 * was uploaded at, cropping rather than letterboxing, so the grid
						 * reads as one clean run of images.
						 *
						 * Cropping to fill is exactly where quality gets lost, which is
						 * what `srcset`/`sizes` are for. The tile is ~290 CSS px wide, so
						 * a phone at 3× wants ~870 real pixels; left to a single 400px
						 * source the browser would stretch it and it would look soft.
						 * With the set it picks a file at least as wide as it needs — see
						 * lib/images.
						 */
						<>
							{/* eslint-disable-next-line @next/next/no-img-element */}
							<img
								src={gridSrcOf(image)}
								srcSet={srcsetOf(image)}
								sizes={GRID_IMAGE_SIZES}
								alt=""
								loading="lazy"
								className={cn(
									"col-start-1 row-start-1 size-full object-cover transition-opacity duration-300",
									second && "group-hover:opacity-0"
								)}
							/>
							{second && (
								// eslint-disable-next-line @next/next/no-img-element
								<img
									src={gridSrcOf(second)}
									srcSet={srcsetOf(second)}
									sizes={GRID_IMAGE_SIZES}
									alt=""
									loading="lazy"
									className="col-start-1 row-start-1 size-full object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-100"
								/>
							)}
						</>
					) : (
						<span className="text-muted-foreground text-xs">{t("noImage")}</span>
					)}
				</Link>

				{/*
				 * Compare · quick view · wishlist, top-right — the live shop's own
				 * rail, its own order, and its own entrance.
				 *
				 * One white pill rather than three boxes, and it **slides in from the
				 * right** while fading: `translate3d(20px,0,0) → 0` over 300ms, which
				 * is exactly what `.wd-buttons` does. Sliding is what makes it read
				 * as arriving rather than merely appearing.
				 *
				 * Hidden until hover on a pointer device, but always present for a
				 * keyboard: `focus-within` brings it back, so tabbing through a grid
				 * never lands on a control nobody can see. On touch there is no
				 * hover, so it simply stays.
				 */}
				<div className="absolute top-2.5 right-2.5 flex translate-x-5 flex-col divide-y divide-neutral-200/70 rounded-full bg-white opacity-0 shadow-[1px_1px_4px_rgba(0,0,0,0.12)] transition-[opacity,transform] duration-300 ease-out group-focus-within:translate-x-0 group-focus-within:opacity-100 group-hover:translate-x-0 group-hover:opacity-100 motion-reduce:transition-none max-lg:translate-x-0 max-lg:opacity-100">
					<RailButton
						label={t("compare")}
						active={compared}
						onClick={() => dispatch(toggleCompare(product.id))}
					>
						{compared ? <Check className="size-4" /> : <Repeat className="size-4" />}
					</RailButton>

					{onQuickView && (
						<RailButton label={t("quickView")} onClick={() => onQuickView(product)}>
							<Eye className="size-4" />
						</RailButton>
					)}

					<RailButton
						label={t("addToWishlist")}
						busy={wishlistState.isLoading}
						active={wishlistState.isSuccess}
						onClick={() => {
							// Nothing to add without a variant — a product with no active
							// variant is not purchasable either.
							if (product.defaultVariantId) void addToWishlist(product.defaultVariantId)
						}}
					>
						<Heart className={cn("size-4", wishlistState.isSuccess && "fill-current")} />
					</RailButton>
				</div>
			</div>

			{/* `flex-1` here and `mt-auto` on the footer are what keep every card
			    the same height however long the name runs. */}
			<div className="flex flex-1 flex-col gap-1.5 p-4">
				<Link
					href={{ pathname: "/products/[slug]", params: { slug: product.slug } }}
					className="hover:text-primary line-clamp-2 block text-[15px] leading-snug font-semibold transition-colors"
					title={product.name}
				>
					{product.name}
				</Link>

				{!!product.categories.length && (
					<p className="text-muted-foreground truncate text-xs">
						{product.categories.map((c) => c.name).join(", ")}
					</p>
				)}

				<div className="mt-auto pt-3">
					{product.quoteOnly ? (
						<p className="text-muted-foreground text-sm italic">{t("priceOnRequest")}</p>
					) : product.priceFrom ? (
						<p className="text-[15px] font-bold">
							{formatMoney(Number(product.priceFrom))}
							<span className="text-muted-foreground ml-1 text-xs font-normal">
								{t("exclVat")}
							</span>
						</p>
					) : (
						<p className="text-muted-foreground text-sm">—</p>
					)}

					<Link
						href={
							product.quoteOnly
								? "/quote-basket"
								: { pathname: "/products/[slug]", params: { slug: product.slug } }
						}
						className="bg-primary text-primary-foreground mt-3 block px-4 py-2.5 text-center text-xs font-semibold tracking-wide uppercase transition-opacity hover:opacity-90"
					>
						{product.quoteOnly ? t("addToQuote") : t("addToCart")}
					</Link>
				</div>
			</div>
		</article>
	)
}

export default ProductCard
