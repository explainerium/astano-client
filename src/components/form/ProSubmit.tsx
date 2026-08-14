"use client"

import { useEffect, useState, type ReactNode } from "react"
import { useFormContext } from "react-hook-form"
import { useTranslations } from "next-intl"
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
 * How long a submit may run before the button says so in words.
 *
 * A spinner answers "did my click register". It stops answering "is this
 * broken" somewhere around four seconds — and this API can take a great deal
 * longer than that when it has been idle and has to wake up, which is exactly
 * when a customer decides nothing is happening and clicks away.
 */
const SLOW_AFTER_MS = 4000

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
	const t = useTranslations("common")
	const {
		formState: { isSubmitting },
	} = useFormContext()

	const [slow, setSlow] = useState(false)

	useEffect(() => {
		if (!isSubmitting) return

		const timer = setTimeout(() => setSlow(true), SLOW_AFTER_MS)
		return () => {
			clearTimeout(timer)
			setSlow(false)
		}
	}, [isSubmitting])

	return (
		<Button
			type="submit"
			size={size}
			variant={variant}
			disabled={isSubmitting}
			className={cn(className)}
		>
			{isSubmitting && <Loader2 className="animate-spin" />}
			{isSubmitting ? (slow ? t("stillWorking") : (pendingLabel ?? children)) : children}
		</Button>
	)
}

export default ProSubmit
