"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Tabs as TabsPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

/*
 * `orientation` is handed to radix rather than consumed here. It stamps
 * data-orientation on the list and every trigger as well as the root, which is
 * what the styling below reads, and it points the arrow keys the right way —
 * up and down through a side rail, left and right along a strip.
 *
 * It used to be destructured out and written back as a bare data-orientation on
 * the root alone. The parts underneath stayed horizontal, so the styling had to
 * reach up to the root through a group selector to find the real orientation —
 * and a group selector matches *any* ancestor, so a tab set nested inside a
 * vertical one came out on its side too.
 */
function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn(
        "group/tabs flex gap-2 data-horizontal:flex-col",
        className
      )}
      {...props}
    />
  )
}

/**
 * The pill strip the whole dashboard navigates form sections with.
 *
 * Rebuilt from the shadcn default, which was 32px tall with 6px of horizontal
 * padding and a white-on-grey active state — legible, but cramped enough that
 * five labels ran together, and with no trace of the admin's own accent.
 *
 * Now: a proper 44px target, a hairline around the tray so it reads as a
 * control rather than a grey smudge, and an active tab that is a raised card
 * with its label in the accent. One change rather than nine, because nothing
 * outside the dashboard uses these — the storefront's product tabs are their
 * own component.
 *
 * Orientation is read from each part's own data-orientation, which radix sets
 * on the list and the triggers as well as the root — never from an ancestor
 * group. `group-data-vertical/tabs:` matches *any* ancestor carrying the group,
 * so putting a tab set inside a vertical one turned the inner strip on its side
 * as well: the product form's side rail stood the Guests / Retail / Resellers
 * ladder on end.
 */
const tabsListVariants = cva(
  "group/tabs-list inline-flex w-fit items-center justify-center rounded-lg p-1 text-muted-foreground data-horizontal:h-11 data-vertical:h-fit data-vertical:flex-col data-vertical:items-stretch data-[variant=line]:rounded-none",
  {
    variants: {
      variant: {
        default: "bg-muted border border-border/70 gap-1",
        line: "gap-1 bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function TabsList({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> &
  VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        // Sized to its label rather than stretched: five sections of wildly
        // different name lengths given equal widths reads as an accident.
        "relative inline-flex h-full items-center justify-center gap-2 rounded-md border border-transparent px-3.5 text-sm font-medium whitespace-nowrap text-muted-foreground transition-all duration-150 data-vertical:w-full data-vertical:justify-start data-vertical:px-3 data-vertical:py-2 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        // Inactive tabs lift on hover so the strip feels like a control before
        // anything is clicked.
        "hover:text-foreground group-data-[variant=default]/tabs-list:hover:bg-card/70",
        // The active tab is a raised card carrying the accent — the dashboard's
        // one saturated colour, used here to say "you are on this one".
        "group-data-[variant=default]/tabs-list:data-active:bg-card group-data-[variant=default]/tabs-list:data-active:text-primary group-data-[variant=default]/tabs-list:data-active:font-semibold group-data-[variant=default]/tabs-list:data-active:shadow-sm group-data-[variant=default]/tabs-list:data-active:ring-1 group-data-[variant=default]/tabs-list:data-active:ring-black/5",
        "group-data-[variant=line]/tabs-list:bg-transparent group-data-[variant=line]/tabs-list:data-active:bg-transparent group-data-[variant=line]/tabs-list:data-active:text-foreground",
        "after:absolute after:bg-primary after:opacity-0 after:transition-opacity data-horizontal:after:inset-x-0 data-horizontal:after:bottom-[-5px] data-horizontal:after:h-0.5 data-vertical:after:inset-y-0 data-vertical:after:-right-1 data-vertical:after:w-0.5 group-data-[variant=line]/tabs-list:data-active:after:opacity-100",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 text-sm outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
