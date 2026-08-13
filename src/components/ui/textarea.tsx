import * as React from "react"

import { cn } from "@/lib/utils"

/*
 * `data-gramm` and friends ask the writing assistants to keep out.
 *
 * Grammarly attaches to every textarea it finds and inserts its own nodes
 * around them. React did not put those nodes there, so when it later takes the
 * surrounding subtree down it asks the DOM to remove a child that has since
 * been moved — "The node to be removed is not a child of this node", and the
 * page is dead until it is reloaded. Passed as defaults so a caller can still
 * turn assistance back on for a field where it would genuinely help.
 */
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      data-gramm="false"
      data-gramm_editor="false"
      data-enable-grammarly="false"
      className={cn(
        "flex field-sizing-content min-h-16 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-base transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
