"use client"

import { useEffect, useState } from "react"
import { useFormContext, useFormState } from "react-hook-form"
import { useTranslations } from "next-intl"
import { Loader2 } from "lucide-react"

/**
 * A line under the form saying what is happening, for the submits that are
 * genuinely slow.
 *
 * The button already spins and changes its label, and on a fast request that is
 * the right amount of feedback — anything more would flash and be noise. This
 * is for the case that is not fast: the API sleeps after fifteen idle minutes
 * on its current hosting and takes the better part of a minute to wake, and a
 * 16px spinner is not enough to hold somebody through that. What they do
 * instead is click again, then decide the site is broken.
 *
 * So after a couple of seconds this appears and says, in words, that the
 * request is on its way and why it may take a moment. It is deliberately not
 * shown immediately: a login that answers in 300ms should not flash a warning
 * about slowness on the way past.
 */

/** Long enough that a warm server never triggers it. */
const SHOW_AFTER_MS = 2500

export const SubmitStatus = ({
	/** Defaults to the generic wording; pass one that names the action. */
	message,
}: {
	message?: string
}) => {
	const t = useTranslations("common")
	// See ProSubmit: the context copy of formState never updates.
	const { control } = useFormContext()
	const { isSubmitting } = useFormState({ control })

	const [visible, setVisible] = useState(false)

	// Cleared in the cleanup rather than in the body, the same shape ProSubmit
	// uses: setting state straight from an effect is what the compiler's rules
	// refuse, and the teardown is where "no longer submitting" belongs anyway.
	useEffect(() => {
		if (!isSubmitting) return

		const timer = setTimeout(() => setVisible(true), SHOW_AFTER_MS)
		return () => {
			clearTimeout(timer)
			setVisible(false)
		}
	}, [isSubmitting])

	if (!isSubmitting || !visible) return null

	return (
		/*
		 * `role="status"` and `aria-live="polite"`, so it is announced rather than
		 * only drawn. Somebody using a screen reader gets even less from a spinner
		 * than everybody else does.
		 */
		<p
			role="status"
			aria-live="polite"
			className="text-muted-foreground flex items-start gap-2 text-sm"
		>
			<Loader2 className="mt-0.5 size-4 shrink-0 animate-spin" />
			<span>{message ?? t("wakingUp")}</span>
		</p>
	)
}

export default SubmitStatus
