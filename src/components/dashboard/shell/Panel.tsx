import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

/**
 * The dashboard's card. Every tile, chart and list on the page sits in one, so
 * radius, background and border are decided here and nowhere else.
 */
export const Panel = ({
	title,
	action,
	className,
	children,
}: {
	title?: ReactNode
	action?: ReactNode
	className?: string
	children?: ReactNode
}) => (
	<section className={cn("bg-card border-border rounded-lg border p-5", className)}>
		{(title || action) && (
			<header className="mb-4 flex items-center justify-between gap-3">
				{typeof title === "string" ? (
					<h2 className="font-heading text-base font-semibold">{title}</h2>
				) : (
					title
				)}
				{action}
			</header>
		)}
		{children}
	</section>
)

export default Panel
