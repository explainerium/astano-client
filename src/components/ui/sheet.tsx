"use client"

import * as React from "react"
import { Dialog as SheetPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

/**
 * A panel that slides in from an edge.
 *
 * Radix's Dialog underneath, so focus trapping, `aria-modal`, Escape, scroll
 * locking and the return of focus to whatever opened it all come for free — the
 * parts of a drawer that are invisible when right and obvious when wrong.
 *
 * Separate from `dialog.tsx` rather than a variant of it: a dialog is centred
 * and sized to its content, a sheet is pinned to an edge and full-height, and
 * one component doing both ends up with a prop that changes everything.
 */

function Sheet({ ...props }: React.ComponentProps<typeof SheetPrimitive.Root>) {
	return <SheetPrimitive.Root data-slot="sheet" {...props} />
}

function SheetTrigger({ ...props }: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
	return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetClose({ ...props }: React.ComponentProps<typeof SheetPrimitive.Close>) {
	return <SheetPrimitive.Close data-slot="sheet-close" {...props} />
}

function SheetPortal({ ...props }: React.ComponentProps<typeof SheetPrimitive.Portal>) {
	return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />
}

function SheetOverlay({
	className,
	...props
}: React.ComponentProps<typeof SheetPrimitive.Overlay>) {
	return (
		<SheetPrimitive.Overlay
			data-slot="sheet-overlay"
			// Darker than the dialog's scrim and blurred: a sheet leaves most of
			// the page visible, and without something to push it back the eye keeps
			// reading the shop behind the panel.
			className={cn(
				"fixed inset-0 z-50 bg-black/40 duration-300 supports-backdrop-filter:backdrop-blur-[2px] data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
				className
			)}
			{...props}
		/>
	)
}

function SheetContent({
	className,
	children,
	side = "right",
	...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & {
	side?: "right" | "left"
}) {
	return (
		<SheetPortal>
			<SheetOverlay />
			<SheetPrimitive.Content
				data-slot="sheet-content"
				className={cn(
					"bg-background fixed inset-y-0 z-50 flex h-full w-full flex-col shadow-2xl outline-none sm:max-w-md",
					// 300ms on a decelerating curve. The default 150ms reads as a jump
					// on a panel this wide, and this easing — the one native sheets
					// use — arrives quickly then settles instead of stopping dead.
					"transition duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] data-open:animate-in data-closed:animate-out",
					side === "right" &&
						"right-0 border-l data-open:slide-in-from-right data-closed:slide-out-to-right",
					side === "left" &&
						"left-0 border-r data-open:slide-in-from-left data-closed:slide-out-to-left",
					className
				)}
				{...props}
			>
				{children}
			</SheetPrimitive.Content>
		</SheetPortal>
	)
}

function SheetTitle({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Title>) {
	return (
		<SheetPrimitive.Title
			data-slot="sheet-title"
			className={cn("font-heading text-lg font-semibold tracking-tight", className)}
			{...props}
		/>
	)
}

function SheetDescription({
	className,
	...props
}: React.ComponentProps<typeof SheetPrimitive.Description>) {
	return (
		<SheetPrimitive.Description
			data-slot="sheet-description"
			className={cn("text-muted-foreground text-sm", className)}
			{...props}
		/>
	)
}

export {
	Sheet,
	SheetTrigger,
	SheetClose,
	SheetPortal,
	SheetOverlay,
	SheetContent,
	SheetTitle,
	SheetDescription,
}
