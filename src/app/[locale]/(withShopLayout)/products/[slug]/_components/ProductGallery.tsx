"use client"

import { useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import type { PublicImage } from "@/types/storefront"

/**
 * Product images.
 *
 * Each asset ships a srcset from the API — thumb / grid / detail / zoom — so
 * the thumbnails request thumbnails rather than scaling the full image down in
 * the browser.
 *
 * The thumbnails are a slider, the way WooCommerce shows them, rather than the
 * wrapping grid this used to be. A product with nine pictures grew a second and
 * third row of thumbnails that pushed the price and the add-to-cart button down
 * the page; a strip that scrolls stays one row however many there are.
 */

/** How many thumbnails are across at once — the width the grid used to show. */
const PER_VIEW = 5

export const ProductGallery = ({ images, alt }: { images: PublicImage[]; alt: string }) => {
	const t = useTranslations("shop")
	const tc = useTranslations("common")
	const [active, setActive] = useState(0)

	const stripRef = useRef<HTMLUListElement>(null)

	/**
	 * Which arrows are usable.
	 *
	 * Updated from the scroll event rather than measured in an effect. The strip
	 * starts at the far left, so this opening value is right from the first
	 * render — and the arrows are not drawn at all unless the strip overflows.
	 */
	const [edges, setEdges] = useState({ atStart: true, atEnd: false })

	if (!images.length) {
		return (
			<div className="bg-muted text-muted-foreground flex aspect-square items-center justify-center text-sm">
				{t("noImage")}
			</div>
		)
	}

	// Clamped rather than reset: a reprice returns a fresh array with the same
	// pictures in it, and resetting on that would snap the viewer back to the
	// first image every time the quantity changed.
	const current = images[Math.min(active, images.length - 1)]

	// A count, not a measurement: five fit by construction, so anything more
	// scrolls. No layout read, and correct before the browser has drawn anything.
	const scrolls = images.length > PER_VIEW

	const page = (direction: 1 | -1) => {
		const strip = stripRef.current
		if (!strip) return

		strip.scrollBy({
			// One screenful at a time, like paging a carousel.
			left: direction * strip.clientWidth,
			behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
				? "auto"
				: "smooth",
		})
	}

	const arrow = "bg-background/90 absolute top-1/2 z-10 flex size-8 -translate-y-1/2 items-center justify-center border shadow-sm transition-opacity hover:opacity-100 disabled:pointer-events-none disabled:opacity-0"

	return (
		<div className="space-y-4">
			<div className="bg-muted aspect-square overflow-hidden">
				{/* eslint-disable-next-line @next/next/no-img-element */}
				<img
					src={current.srcset.detail ?? current.url}
					alt={alt}
					className="size-full object-contain"
				/>
			</div>

			{images.length > 1 && (
				<div className="relative">
					<ul
						ref={stripRef}
						onScroll={(event) => {
							const strip = event.currentTarget
							setEdges({
								// A pixel of slack: sub-pixel layout means scrollLeft rarely
								// lands on exactly 0 or exactly the maximum.
								atStart: strip.scrollLeft <= 1,
								atEnd: strip.scrollLeft + strip.clientWidth >= strip.scrollWidth - 1,
							})
						}}
						className={cn(
							"flex snap-x snap-mandatory gap-3 overflow-x-auto",
							// No scrollbar under the thumbnails — the arrows say it moves,
							// and on a trackpad it moves whether or not a bar is drawn.
							"[scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
						)}
					>
						{images.map((image, index) => (
							// Exactly five across, gaps included, so the strip looks like
							// the grid it replaced until there is a sixth picture.
							<li
								key={image.id}
								className="w-[calc((100%-3rem)/5)] shrink-0 snap-start"
							>
								<button
									type="button"
									onClick={() => setActive(index)}
									aria-label={`${alt} ${index + 1}`}
									aria-current={index === active ? "true" : undefined}
									className={cn(
										"bg-muted block aspect-square w-full overflow-hidden border-2 transition-colors",
										index === active
											? "border-primary"
											: "border-transparent hover:border-neutral-300"
									)}
								>
									{/* eslint-disable-next-line @next/next/no-img-element */}
									<img
										src={image.srcset.thumb ?? image.url}
										alt=""
										loading="lazy"
										className="size-full object-contain"
									/>
								</button>
							</li>
						))}
					</ul>

					{/*
					 * Drawn only when there is something to scroll to, and each one
					 * fades out at its end rather than sitting there dead.
					 */}
					{scrolls && (
						<>
							<button
								type="button"
								onClick={() => page(-1)}
								disabled={edges.atStart}
								aria-label={tc("previous")}
								className={cn(arrow, "left-0")}
							>
								<ChevronLeft className="size-4" />
							</button>

							<button
								type="button"
								onClick={() => page(1)}
								disabled={edges.atEnd}
								aria-label={tc("next")}
								className={cn(arrow, "right-0")}
							>
								<ChevronRight className="size-4" />
							</button>
						</>
					)}
				</div>
			)}
		</div>
	)
}

export default ProductGallery
