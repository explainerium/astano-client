"use client"

import { Check, FileLock2 } from "lucide-react"
import { cn } from "@/lib/utils"
import type { MediaAsset } from "@/types/media"

const formatSize = (bytes: number): string =>
	bytes >= 1024 * 1024
		? `${(bytes / 1024 / 1024).toFixed(1)} MB`
		: `${Math.max(1, Math.round(bytes / 1024))} KB`

/**
 * Presentational only. Selection state and every bulk action live in the
 * toolbar above, so the grid cannot grow its own floating action bar and push
 * the page around when something is picked.
 */
export const MediaGrid = ({
	assets,
	selected,
	onToggle,
}: {
	assets: MediaAsset[]
	selected: Set<string>
	onToggle: (id: string) => void
}) => {
	if (!assets.length) {
		return (
			<div className="text-muted-foreground bg-card rounded-lg border border-dashed p-16 text-center text-sm">
				Nothing here yet. Drop images above to add them.
			</div>
		)
	}

	return (
		<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
			{assets.map((asset) => {
				const isSelected = selected.has(asset.id)
				// Prefer the grid derivative — full-size originals in a 5-column
				// layout would be megabytes of wasted bandwidth.
				const thumb = asset.derivatives.grid ?? asset.derivatives.thumb ?? asset.url

				return (
					<button
						key={asset.id}
						type="button"
						onClick={() => onToggle(asset.id)}
						aria-pressed={isSelected}
						className={cn(
							"group bg-card relative overflow-hidden rounded-lg border text-left transition-shadow",
							isSelected ? "ring-primary ring-2" : "hover:shadow-sm"
						)}
					>
						<div className="bg-muted flex aspect-square items-center justify-center overflow-hidden">
							{thumb ? (
								// Plain img, not next/image: these are already sized WebP
								// derivatives, so re-optimising them costs time and gains
								// nothing.
								// eslint-disable-next-line @next/next/no-img-element
								<img
									src={thumb}
									alt={asset.alt ?? asset.originalName}
									loading="lazy"
									className="size-full object-cover"
								/>
							) : (
								<div className="text-muted-foreground flex flex-col items-center gap-1 p-4 text-center">
									<FileLock2 className="size-6" />
									<span className="text-[11px]">Private file</span>
								</div>
							)}
						</div>

						{/*
						 * A styled span, not the Checkbox component: shadcn's Checkbox
						 * renders a <button>, and the whole tile is already a <button>.
						 * Nesting them is invalid HTML and throws a hydration error.
						 *
						 * Purely decorative — the tile carries the click handler and the
						 * aria-pressed state, so this is hidden from assistive tech
						 * rather than announced a second time.
						 */}
						<span
							aria-hidden
							className={cn(
								"absolute top-2 left-2 flex size-4 items-center justify-center rounded-[4px] border shadow-xs transition-opacity",
								isSelected
									? "bg-primary border-primary text-primary-foreground opacity-100"
									: "bg-card opacity-0 group-hover:opacity-100"
							)}
						>
							{isSelected && <Check className="size-3" />}
						</span>

						<div className="space-y-0.5 p-2">
							<p className="truncate text-xs font-medium" title={asset.originalName}>
								{asset.originalName}
							</p>
							<p className="text-muted-foreground text-[11px]">
								{asset.width && asset.height && `${asset.width}×${asset.height} · `}
								{formatSize(asset.sizeBytes)}
							</p>
						</div>
					</button>
				)
			})}
		</div>
	)
}

export default MediaGrid
