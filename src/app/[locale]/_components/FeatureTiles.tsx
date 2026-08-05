"use client"

import { useTranslations } from "next-intl"
import { TILE_IMAGES } from "@/lib/wpMedia"

/**
 * The four photographic tiles directly under the hero, edge to edge with no
 * gutter — exactly as the live site runs them.
 */
export const FeatureTiles = () => {
	const t = useTranslations("home")
	const tiles = t.raw("tiles") as { title: string; body: string }[]

	return (
		<section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
			{tiles.map((tile, i) => (
				<article key={i} className="relative isolate min-h-[240px] overflow-hidden">
					{/* eslint-disable-next-line @next/next/no-img-element */}
					<img
						src={TILE_IMAGES[i]}
						alt=""
						loading="lazy"
						className="absolute inset-0 size-full object-cover"
					/>
					<div className="absolute inset-0 bg-black/35" />

					<div className="relative flex h-full flex-col justify-end p-6">
						<h2 className="font-heading text-xl leading-tight font-semibold text-white">
							{tile.title}
						</h2>
						<p className="mt-2 max-w-xs text-xs leading-relaxed text-white/85">{tile.body}</p>
					</div>
				</article>
			))}
		</section>
	)
}

export default FeatureTiles
