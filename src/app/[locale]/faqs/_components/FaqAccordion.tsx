"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { cn } from "@/lib/utils"

export interface FaqItem {
	q: string
	a: string
}

/**
 * One FAQ group.
 *
 * Written by hand rather than pulled from a UI library: it is a disclosure
 * list, and the whole behaviour is one piece of state plus the right ARIA
 * wiring. Several items may be open at once — an accordion that closes your
 * last answer when you open the next one makes comparing two of them
 * impossible.
 *
 * The panel is always in the DOM and collapsed with a grid track, so the
 * answers are findable by the browser's own in-page search and by crawlers
 * even while closed.
 */
export const FaqAccordion = ({ id, items }: { id: string; items: FaqItem[] }) => {
	const [open, setOpen] = useState<Set<number>>(new Set())

	const toggle = (index: number) =>
		setOpen((current) => {
			const next = new Set(current)
			if (next.has(index)) next.delete(index)
			else next.add(index)
			return next
		})

	return (
		<div className="divide-y border-y">
			{items.map((item, index) => {
				const isOpen = open.has(index)
				const panelId = `${id}-panel-${index}`
				const buttonId = `${id}-button-${index}`

				return (
					<div key={index}>
						<h3>
							<button
								type="button"
								id={buttonId}
								aria-expanded={isOpen}
								aria-controls={panelId}
								onClick={() => toggle(index)}
								className="hover:text-primary flex w-full items-start gap-4 py-5 text-left transition-colors"
							>
								<span className="flex-1 text-sm font-medium sm:text-base">{item.q}</span>
								<Plus
									className={cn(
										"text-primary mt-0.5 size-5 shrink-0 transition-transform duration-200",
										isOpen && "rotate-45"
									)}
								/>
							</button>
						</h3>

						<div
							id={panelId}
							role="region"
							aria-labelledby={buttonId}
							className={cn(
								"grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none",
								isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
							)}
						>
							<div className="overflow-hidden">
								<p className="text-muted-foreground pb-5 text-sm leading-relaxed">{item.a}</p>
							</div>
						</div>
					</div>
				)
			})}
		</div>
	)
}

export default FaqAccordion
