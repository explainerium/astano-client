"use client"

import { useTranslations } from "next-intl"
import { useFormContext } from "react-hook-form"
import { Languages, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { useAiStatusQuery, useTranslateTextMutation } from "@/redux/api/aiApi"

/**
 * "Fill this language from the other one."
 *
 * The client asked for what WordPress gave them: one click that takes the
 * German box and writes the English one. It is the same assistant and the same
 * key as the write button — a translation is not a second integration.
 *
 * A form-level control rather than a field-level one, because the thing being
 * translated is a tab, not a box: a product has a name, a summary and a
 * description in each language, and pressing three buttons to fill one side is
 * three chances to forget the third.
 *
 * What it will not do is overwrite. A field that already has something in it is
 * left exactly as it is, and the toast says how many were skipped — the whole
 * risk here is a button that quietly replaces copy somebody wrote by hand.
 */

export interface TranslatableField {
	/** Form field holding the source text, e.g. `de.description`. */
	from: string
	/** Form field to fill, e.g. `en.description`. */
	to: string
	/** HTML round-trips as HTML; a name comes back as plain text. */
	html?: boolean
}

export const TranslateFields = ({
	fields,
	from = "de",
	to = "en",
	className,
}: {
	fields: TranslatableField[]
	from?: "de" | "en"
	to?: "de" | "en"
	className?: string
}) => {
	const t = useTranslations("admin")
	const { getValues, setValue } = useFormContext()
	const { data: status } = useAiStatusQuery()
	const [translateText, { isLoading }] = useTranslateTextMutation()

	if (!status?.enabled || !status.configured) return null

	const run = async () => {
		const pending = fields.filter((field) => {
			const source = String(getValues(field.from) ?? "").trim()
			const target = String(getValues(field.to) ?? "").trim()
			return source && !target
		})

		if (!pending.length) {
			toast.info(t("aiNothingToTranslate"))
			return
		}

		let filled = 0

		try {
			for (const field of pending) {
				const { text } = await translateText({
					text: String(getValues(field.from) ?? ""),
					from,
					to,
					html: field.html ?? false,
				}).unwrap()

				if (!text) continue

				// `shouldDirty` so the form knows there is something to save — without
				// it the Save button sits inactive over a filled-in tab.
				setValue(field.to, text, { shouldDirty: true, shouldValidate: true })
				filled++
			}

			const skipped = fields.length - pending.length
			toast.success(t("aiTranslatedCount", { count: filled, skipped }))
		} catch (error) {
			const message = (error as { data?: { message?: string } })?.data?.message
			toast.error(message ?? t("aiCouldNotTranslate"))
		}
	}

	return (
		<Button
			type="button"
			variant="outline"
			size="sm"
			className={className}
			onClick={() => void run()}
			disabled={isLoading}
			aria-busy={isLoading}
		>
			{isLoading ? <Loader2 className="size-4 animate-spin" /> : <Languages className="size-4" />}
			{isLoading ? t("aiTranslating") : t("aiTranslateFromGerman")}
		</Button>
	)
}

export default TranslateFields
