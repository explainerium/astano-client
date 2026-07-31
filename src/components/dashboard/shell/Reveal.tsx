"use client"

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/**
 * Animated show/hide for a panel of unknown height.
 *
 * Uses the `grid-template-rows: 0fr → 1fr` technique rather than animating
 * `height`, because height cannot transition to `auto` — the usual workarounds
 * are a hardcoded max-height that clips tall content, or measuring the element
 * in JavaScript on every resize. A grid track interpolates to the content's own
 * height with no measurement and no magic number.
 *
 * The inner `overflow-hidden` is what makes it work: without it the content
 * spills out of the collapsing track instead of being clipped.
 */
export const Reveal = ({
	open,
	children,
	className,
}: {
	open: boolean
	children: ReactNode
	className?: string
}) => (
	<div
		aria-hidden={!open}
		className={cn(
			"grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none",
			open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
			className
		)}
	>
		<div className="overflow-hidden">
			{/* Spacing lives inside, so a closed panel contributes no gap at all. */}
			<div className={cn(open && "pb-4")}>{children}</div>
		</div>
	</div>
)

export default Reveal
