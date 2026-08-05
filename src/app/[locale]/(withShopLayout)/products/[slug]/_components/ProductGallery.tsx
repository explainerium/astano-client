"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"
import type { PublicImage } from "@/types/storefront"

/**
 * Product images.
 *
 * Each asset ships a srcset from the API — thumb / grid / detail / zoom — so
 * the thumbnails request thumbnails rather than scaling the full image down in
 * the browser.
 */
export const ProductGallery = ({ images, alt }: { images: PublicImage[]; alt: string }) => {
	const t = useTranslations("shop")
	const [active, setActive] = useState(0)

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
				<ul className="grid grid-cols-5 gap-3">
					{images.map((image, index) => (
						<li key={image.id}>
							<button
								type="button"
								onClick={() => setActive(index)}
								aria-label={`${alt} ${index + 1}`}
								aria-current={index === active ? "true" : undefined}
								className={cn(
									"bg-muted block aspect-square w-full overflow-hidden border-2 transition-colors",
									index === active ? "border-primary" : "border-transparent hover:border-neutral-300"
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
			)}
		</div>
	)
}

export default ProductGallery
