import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export interface StatCardProps {
	label: string
	value: string
	icon: LucideIcon
	/** Percentage change against the comparison period. */
	delta?: { value: string; direction: "up" | "down" }
	caption?: string
	/** The first tile in the row is filled, matching the reference design. */
	highlighted?: boolean
}

export const StatCard = ({
	label,
	value,
	icon: Icon,
	delta,
	caption,
	highlighted,
}: StatCardProps) => (
	<div
		className={cn(
			"rounded-2xl border p-5",
			highlighted
				? "bg-accent-soft-strong border-transparent"
				: "bg-card border-border"
		)}
	>
		<div className="flex items-start justify-between gap-3">
			<p className="text-muted-foreground text-sm">{label}</p>
			<span
				className={cn(
					"flex size-8 shrink-0 items-center justify-center rounded-lg",
					highlighted
						? "bg-primary text-primary-foreground"
						: "bg-muted text-muted-foreground"
				)}
			>
				<Icon className="size-4" strokeWidth={1.75} />
			</span>
		</div>

		<div className="mt-3 flex items-end justify-between gap-3">
			<p className="font-heading text-[28px] leading-none font-semibold tracking-tight">
				{value}
			</p>

			{delta && (
				<div className="text-right">
					<span
						className={cn(
							"rounded-md px-1.5 py-0.5 text-xs font-medium",
							delta.direction === "up"
								? "bg-positive-soft text-positive"
								: "bg-negative-soft text-negative"
						)}
					>
						{delta.value}
					</span>
					{caption && (
						<p className="text-muted-foreground mt-1 text-[11px]">{caption}</p>
					)}
				</div>
			)}
		</div>
	</div>
)

export default StatCard
