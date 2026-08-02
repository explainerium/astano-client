"use client"

import { useState } from "react"
import { useFormContext } from "react-hook-form"
import { ChevronLeft, ChevronRight, ImagePlus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { MediaAsset } from "@/types/media"
import type { AdminProduct, ProductImage } from "@/types/product"
import AssetPickerDialog from "./AssetPickerDialog"

/** Smallest derivative that exists. Never the original — these are tiles. */
const thumbOfAsset = (asset: MediaAsset) =>
	asset.derivatives.thumb ?? asset.derivatives.grid ?? asset.url ?? ""

const thumbOfImage = (image: ProductImage) =>
	image.srcset.thumb ?? image.srcset.grid ?? image.url

const Tile = ({ src, alt }: { src?: string; alt: string }) =>
	src ? (
		// Plain img, not next/image: these are already sized WebP derivatives, so
		// re-optimising them costs time and gains nothing.
		// eslint-disable-next-line @next/next/no-img-element
		<img src={src} alt={alt} loading="lazy" className="size-full object-cover" />
	) : (
		<div className="text-muted-foreground flex size-full items-center justify-center text-[10px]">
			No preview
		</div>
	)

const seedThumbs = (product?: AdminProduct) => {
	const map: Record<string, string> = {}
	if (product?.featuredImage) map[product.featuredImage.id] = thumbOfImage(product.featuredImage)
	for (const image of product?.images ?? []) map[image.id] = thumbOfImage(image)
	return map
}

/**
 * Product image and gallery.
 *
 * The form holds ids — that is what the API takes — while this component holds
 * a separate id → thumbnail map so it can draw them. The map is seeded from
 * what the product arrived with and extended as the picker hands back assets,
 * so nothing is ever re-fetched just to show a picture the page already has.
 */
export const ProductImages = ({ product }: { product?: AdminProduct }) => {
	const { watch, setValue } = useFormContext()

	const featuredAssetId = watch("featuredAssetId") as string | null
	const assetIds = (watch("assetIds") ?? []) as string[]

	const [thumbs, setThumbs] = useState<Record<string, string>>(() => seedThumbs(product))
	const [picking, setPicking] = useState<"featured" | "gallery" | null>(null)

	const remember = (assets: MediaAsset[]) =>
		setThumbs((current) => {
			const next = { ...current }
			for (const asset of assets) next[asset.id] = thumbOfAsset(asset)
			return next
		})

	const write = (name: "featuredAssetId" | "assetIds", value: string | null | string[]) =>
		setValue(name, value, { shouldDirty: true })

	const chooseFeatured = (assets: MediaAsset[]) => {
		remember(assets)
		write("featuredAssetId", assets[0]?.id ?? null)
	}

	const addToGallery = (assets: MediaAsset[]) => {
		remember(assets)
		// Adding, not replacing — removal is the ✕ on the tile. Anything already
		// in the gallery is skipped so a second pick cannot duplicate a row.
		const fresh = assets.map((a) => a.id).filter((id) => !assetIds.includes(id))
		write("assetIds", [...assetIds, ...fresh])
	}

	const removeFromGallery = (id: string) =>
		write(
			"assetIds",
			assetIds.filter((current) => current !== id)
		)

	/** Order is sortOrder on the server, so it decides the storefront gallery. */
	const move = (index: number, by: number) => {
		const target = index + by
		if (target < 0 || target >= assetIds.length) return

		const next = [...assetIds]
		;[next[index], next[target]] = [next[target], next[index]]
		write("assetIds", next)
	}

	return (
		<div className="space-y-5">
			<div className="space-y-2">
				<p className="text-muted-foreground text-xs">
					Shown in listings, search results and the cart.
				</p>

				{featuredAssetId ? (
					<div className="relative">
						<button
							type="button"
							onClick={() => setPicking("featured")}
							aria-label="Replace the product image"
							className="bg-muted block aspect-square w-full overflow-hidden rounded-lg border"
						>
							<Tile src={thumbs[featuredAssetId]} alt="Product image" />
						</button>
						<Button
							type="button"
							variant="secondary"
							size="icon"
							aria-label="Remove the product image"
							className="absolute top-2 right-2 size-7"
							onClick={() => write("featuredAssetId", null)}
						>
							<X />
						</Button>
					</div>
				) : (
					<Button
						type="button"
						variant="outline"
						className="w-full"
						onClick={() => setPicking("featured")}
					>
						<ImagePlus />
						Set product image
					</Button>
				)}
			</div>

			<div className="space-y-2 border-t pt-4">
				<div>
					<h3 className="text-sm font-medium">Gallery</h3>
					<p className="text-muted-foreground mt-1 text-xs">
						The extra images on the product page, in this order.
					</p>
				</div>

				{assetIds.length > 0 && (
					<div className="grid grid-cols-3 gap-2">
						{assetIds.map((id, index) => (
							<div
								key={id}
								className="group bg-muted relative aspect-square overflow-hidden rounded-md border"
							>
								<Tile src={thumbs[id]} alt={`Gallery image ${index + 1}`} />

								<Button
									type="button"
									variant="secondary"
									size="icon"
									aria-label={`Remove gallery image ${index + 1}`}
									className="absolute top-1 right-1 size-6 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
									onClick={() => removeFromGallery(id)}
								>
									<X />
								</Button>

								<div className="absolute inset-x-1 bottom-1 flex justify-between opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
									<Button
										type="button"
										variant="secondary"
										size="icon"
										aria-label={`Move gallery image ${index + 1} earlier`}
										className="size-6"
										disabled={index === 0}
										onClick={() => move(index, -1)}
									>
										<ChevronLeft />
									</Button>
									<Button
										type="button"
										variant="secondary"
										size="icon"
										aria-label={`Move gallery image ${index + 1} later`}
										className="size-6"
										disabled={index === assetIds.length - 1}
										onClick={() => move(index, 1)}
									>
										<ChevronRight />
									</Button>
								</div>
							</div>
						))}
					</div>
				)}

				<Button
					type="button"
					variant="outline"
					className="w-full"
					onClick={() => setPicking("gallery")}
				>
					<ImagePlus />
					{assetIds.length ? "Add more images" : "Add gallery images"}
				</Button>
			</div>

			<AssetPickerDialog
				open={picking === "featured"}
				onOpenChange={(open) => !open && setPicking(null)}
				title="Product image"
				description="The main image, shown wherever this product appears in a list."
				confirmLabel="Use image"
				onConfirm={chooseFeatured}
			/>

			<AssetPickerDialog
				open={picking === "gallery"}
				onOpenChange={(open) => !open && setPicking(null)}
				multiple
				title="Gallery images"
				description="Pick as many as you like. They are added in the order you see them here."
				confirmLabel="Add to gallery"
				onConfirm={addToGallery}
			/>
		</div>
	)
}

export default ProductImages
