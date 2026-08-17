"use client"

import { useEffect, useState, type ReactNode } from "react"
import { useFormContext, useFormState } from "react-hook-form"
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

	/**
	 * `useFormState`, not `useFormContext().formState`.
	 *
	 * This is why no submit button in the app ever span. react-hook-form's
	 * `formState` is a proxy that re-renders whichever component *subscribed* to
	 * the field it reads — and the subscription belongs to the `useForm` call,
	 * which lives in ProForm. ProForm never reads `formState`, so nothing
	 * re-rendered when `isSubmitting` flipped, and reading it down here through
	 * the context returned a value that was captured once and never updated.
	 *
	 * The button was correct on every other count: disabled, spinner, changed
	 * label. It simply never learnt that a submit had started. `useFormState`
	 * subscribes this component to the form's state directly, which is what it
	 * exists for.
	 */
	const { control } = useFormContext()
	const { isSubmitting } = useFormState({ control })

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
			/**
			 * Busy has to look different from unavailable.
			 *
			 * `disabled` is what stops a second submit — on this API that would mean
			 * two orders or two accounts — so it stays. But the button's disabled
			 * style fades it to half strength, and a faded button beside an
			 * unchanged label reads as "that did not work", which is the opposite of
			 * what is happening. Full opacity and a wait cursor say working.
			 */
			aria-busy={isSubmitting}
			className={cn(isSubmitting && "cursor-wait disabled:opacity-100", className)}
		>
			{isSubmitting && <Loader2 className="size-4 animate-spin" />}
			{/*
			 * The label changes on the first frame, not after four seconds.
			 *
			 * It used to fall back to `children`, so pressing "Sign in" left the
			 * word "Sign in" sitting there — the only thing that moved was a 16px
			 * spinner and the fade. Somebody who is not looking for it cannot tell
			 * a click registered, which is exactly what was reported.
			 */}
			{isSubmitting ? (slow ? t("stillWorking") : (pendingLabel ?? t("working"))) : children}
		</Button>
	)
}

export default ProSubmit
