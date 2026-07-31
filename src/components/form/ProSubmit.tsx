"use client"

import type { ReactNode } from "react"
import { useFormContext } from "react-hook-form"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface ProSubmitProps {
	children: ReactNode
	/** Shown while the submit handler is in flight. Defaults to `children`. */
	pendingLabel?: ReactNode
	className?: string
	size?: React.ComponentProps<typeof Button>["size"]
	variant?: React.ComponentProps<typeof Button>["variant"]
}

/**
 * Submit button that disables itself while the form is submitting.
 *
 * Reads isSubmitting from the form context rather than taking a prop, so no
 * call site can forget to guard against a double submit — which on this API
 * would mean two orders, or two products with the same SKU.
 */
export const ProSubmit = ({
	children,
	pendingLabel,
	className,
	size = "lg",
	variant,
}: ProSubmitProps) => {
	const {
		formState: { isSubmitting },
	} = useFormContext()

	return (
		<Button
			type="submit"
			size={size}
			variant={variant}
			disabled={isSubmitting}
			className={cn(className)}
		>
			{isSubmitting && <Loader2 className="animate-spin" />}
			{isSubmitting ? (pendingLabel ?? children) : children}
		</Button>
	)
}

export default ProSubmit
