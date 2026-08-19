"use client"

import * as React from "react"
import { RadioGroup as RadioGroupPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function RadioGroup({
	className,
	...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Root>) {
	return (
		<RadioGroupPrimitive.Root
			data-slot="radio-group"
			className={cn("grid w-full gap-2", className)}
			{...props}
		/>
	)
}

/**
 * The shop's radio, built to match the checkbox exactly.
 *
 * Same eighteen pixels, same two-pixel border, same hover, same hundred and
 * fifty milliseconds. A form that mixes a crisp checkbox with a thin, flat
 * radio looks like two components from two different days, and this project
 * puts both in the same column on the checkout page.
 *
 * The one difference is the mark. A radio keeps its ring and fills the middle,
 * because that is what tells someone at a glance that this is a choice of one
 * rather than a set of independent ticks.
 */
function RadioGroupItem({
	className,
	...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Item>) {
	return (
		<RadioGroupPrimitive.Item
			data-slot="radio-group-item"
			className={cn(
				"group/radio-group-item peer relative flex aspect-square size-[18px] shrink-0 items-center justify-center rounded-full border-2 border-neutral-300 bg-white outline-none",
				"transition-[background-color,border-color,box-shadow] duration-150 ease-out motion-reduce:transition-none",
				"after:absolute after:-inset-x-3 after:-inset-y-2",
				"hover:border-neutral-400 data-checked:hover:border-primary",
				"focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/30",
				"disabled:cursor-not-allowed disabled:opacity-50",
				"aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20",
				// Filled ring rather than a filled disc: the dot is the shop's accent
				// and the ring stays white, which reads as "this one" from further
				// away than a solid circle does.
				"data-checked:border-primary",
				className
			)}
			{...props}
		>
			<RadioGroupPrimitive.Indicator
				data-slot="radio-group-indicator"
				className={cn(
					"flex items-center justify-center",
					"animate-in zoom-in-50 duration-150 ease-out motion-reduce:animate-none"
				)}
			>
				<span className="bg-primary size-2.5 rounded-full" />
			</RadioGroupPrimitive.Indicator>
		</RadioGroupPrimitive.Item>
	)
}

export { RadioGroup, RadioGroupItem }
