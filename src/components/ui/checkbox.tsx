"use client"

import * as React from "react"
import { Checkbox as CheckboxPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"
import { CheckIcon } from "lucide-react"

/**
 * The shop's checkbox.
 *
 * Every tick in the storefront and the dashboard is this one — consent boxes,
 * filters, the settings screens, the product configurator. So the things it
 * gets right are worth listing:
 *
 *  - **Eighteen pixels, not sixteen.** The default was a hair small to aim at
 *    on a phone and read as an afterthought beside 14px labels.
 *  - **A visible hover.** An unchecked box that does not respond to the pointer
 *    reads as disabled, which is exactly the wrong signal on an opt-in.
 *  - **The tick arrives.** It scales up from nothing rather than appearing, so
 *    a deliberate click has a deliberate answer. 150ms, and none at all when
 *    the visitor has asked for reduced motion.
 *  - **The hit area is bigger than the box.** The `after` pseudo-element
 *    extends it past the border on every side; an 18px target is a small thing
 *    to hit and the label is not always adjacent.
 */
function Checkbox({
	className,
	...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
	return (
		<CheckboxPrimitive.Root
			data-slot="checkbox"
			className={cn(
				"peer relative flex size-[18px] shrink-0 items-center justify-center rounded-[5px] border-2 border-neutral-300 bg-white outline-none",
				"transition-[background-color,border-color,box-shadow] duration-150 ease-out motion-reduce:transition-none",
				// The invisible margin that makes it hittable.
				"after:absolute after:-inset-x-3 after:-inset-y-2",
				"hover:border-neutral-400 data-checked:hover:border-primary",
				"focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/30",
				"disabled:cursor-not-allowed disabled:opacity-50 group-has-disabled/field:opacity-50",
				"aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20",
				"data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground",
				className
			)}
			{...props}
		>
			<CheckboxPrimitive.Indicator
				data-slot="checkbox-indicator"
				className={cn(
					"grid place-content-center text-current",
					// Radix mounts the indicator only when checked, so this plays on
					// the way in. There is nothing to play on the way out — the node is
					// gone — and a tick that lingers after an untick would be worse
					// than one that simply goes.
					"animate-in zoom-in-50 duration-150 ease-out motion-reduce:animate-none",
					"[&>svg]:size-3.5 [&>svg]:stroke-[3]"
				)}
			>
				<CheckIcon />
			</CheckboxPrimitive.Indicator>
		</CheckboxPrimitive.Root>
	)
}

export { Checkbox }
