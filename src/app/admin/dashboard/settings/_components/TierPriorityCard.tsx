"use client"

import { useState } from "react"
import { ArrowDown, ArrowUp, Loader2, RotateCcw } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { useSaveTierPriorityMutation, useTierPriorityQuery } from "@/redux/api/pricingApi"

type Source = "customer" | "catalogue" | "category"

const DEFAULT_ORDER: Source[] = ["customer", "catalogue", "category"]

/**
 * Which quantity ladder wins when more than one could apply.
 *
 * A ranked list rather than a set of dropdowns, because the thing being chosen
 * *is* an order. Reordered with buttons rather than drag: it is three rows, the
 * buttons work from a keyboard, and a drag handle here would be more machinery
 * than the decision deserves.
 */
export const TierPriorityCard = () => {
	const { data, isLoading } = useTierPriorityQuery()
	const [savePriority, { isLoading: isSaving }] = useSaveTierPriorityMutation()

	const [order, setOrder] = useState<Source[] | null>(null)

	/**
	 * Seeded during render, not from an effect.
	 *
	 * React's own pattern for "derive state once from a prop": the condition
	 * stops being true the moment it fires, so it runs exactly once and never
	 * overwrites a reorder the user has started. An effect would do the same
	 * thing a render later — and the compiler rejects setState inside one.
	 */
	if (data && order === null) setOrder(data.order)

	const rows = order ?? DEFAULT_ORDER
	const describe = (value: string) => data?.sources.find((s) => s.value === value)

	const move = (index: number, by: -1 | 1) => {
		const next = [...rows]
		const target = index + by
		if (target < 0 || target >= next.length) return
		;[next[index], next[target]] = [next[target], next[index]]
		setOrder(next)
	}

	const save = async () => {
		try {
			await savePriority(rows).unwrap()
			toast.success("Pricing priority saved", {
				description: "Every price in the shop is resolved in this order from now on.",
			})
		} catch (error) {
			toast.error("Could not save the priority", {
				description:
					(error as { data?: { message?: string } })?.data?.message ?? "Please try again.",
			})
		}
	}

	const isDefault = rows.join(",") === DEFAULT_ORDER.join(",")
	const isDirty = !!data && rows.join(",") !== data.order.join(",")

	return (
		<section className="bg-card space-y-4 rounded-lg border p-5">
			<div>
				<h2 className="text-base font-semibold">Quantity discount priority</h2>
				<p className="text-muted-foreground mt-1 max-w-prose text-sm">
					A product can be covered by more than one quantity ladder at once. The first source
					in this list that has a rung the order reaches is the one that applies — the others
					are only consulted if it has none.
				</p>
			</div>

			{isLoading && !order ? (
				<div className="text-muted-foreground flex items-center gap-2 py-4 text-sm">
					<Loader2 className="size-4 animate-spin" />
					Loading…
				</div>
			) : (
				<ol className="divide-y rounded-lg border">
					{rows.map((source, index) => (
						<li key={source} className="flex items-start gap-4 p-4">
							<span className="text-muted-foreground mt-0.5 w-5 font-mono text-xs tabular-nums">
								{index + 1}
							</span>
							<div className="min-w-0 flex-1">
								<p className="text-sm font-medium">{describe(source)?.label ?? source}</p>
								<p className="text-muted-foreground mt-0.5 text-xs">
									{describe(source)?.description}
								</p>
							</div>
							<div className="flex shrink-0 gap-1">
								<Button
									type="button"
									variant="ghost"
									size="icon"
									aria-label={`Move ${describe(source)?.label ?? source} up`}
									disabled={index === 0 || isSaving}
									onClick={() => move(index, -1)}
								>
									<ArrowUp />
								</Button>
								<Button
									type="button"
									variant="ghost"
									size="icon"
									aria-label={`Move ${describe(source)?.label ?? source} down`}
									disabled={index === rows.length - 1 || isSaving}
									onClick={() => move(index, 1)}
								>
									<ArrowDown />
								</Button>
							</div>
						</li>
					))}
				</ol>
			)}

			<div className="flex flex-wrap items-center justify-between gap-3">
				<p className="text-muted-foreground text-xs">
					{isDefault
						? "This is the default order — most specific rule first."
						: "Changed from the default order."}
				</p>
				<div className="flex gap-2">
					{!isDefault && (
						<Button
							type="button"
							variant="outline"
							onClick={() => setOrder(DEFAULT_ORDER)}
							disabled={isSaving}
						>
							<RotateCcw />
							Reset to default
						</Button>
					)}
					<Button type="button" onClick={save} disabled={isSaving || !isDirty}>
						{isSaving && <Loader2 className="animate-spin" />}
						Save priority
					</Button>
				</div>
			</div>
		</section>
	)
}

export default TierPriorityCard
