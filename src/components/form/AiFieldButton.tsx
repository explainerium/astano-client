"use client"

import { useTranslations } from "next-intl"
import { useState } from "react"
import { useFormContext } from "react-hook-form"
import { Loader2, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { useAiStatusQuery, useGenerateTextMutation } from "@/redux/api/aiApi"
import type { AiKind } from "@/types/ai"

/**
 * "Write this for me", for the plain boxes.
 *
 * The rich text editor has its own button in its toolbar; a textarea and an
 * input have no toolbar to put one in. So this is a small link under the field,
 * which is where the eye already goes for the hint line.
 *
 * It writes through react-hook-form rather than taking a value and an onChange,
 * so a field only has to say what it is — the component that renders it does
 * not have to thread a second pair of props through to get here.
 */

export interface AiFieldContextPlain {
	kind: AiKind
	locale: "de" | "en"
	name?: string
	sku?: string
	facts?: string[]
	/** Defaults to the kind's usual shape; these boxes are almost always plain. */
	format?: "html" | "text"
}

export const AiFieldButton = ({ field, ai }: { field: string; ai: AiFieldContextPlain }) => {
	const t = useTranslations("admin")
	const { getValues, setValue } = useFormContext()
	const { data: status } = useAiStatusQuery()
	const [generateText, { isLoading }] = useGenerateTextMutation()
	const [open, setOpen] = useState(false)
	const [brief, setBrief] = useState("")

	if (!status?.enabled || !status.configured) return null

	const write = async () => {
		const existing = String(getValues(field) ?? "").trim()

		try {
			const { text } = await generateText({
				kind: ai.kind,
				format: ai.format ?? "text",
				locale: ai.locale,
				brief: brief.trim(),
				name: ai.name,
				sku: ai.sku,
				facts: ai.facts,
				// Rewrite what is there rather than replace it unasked — the same
				// rule the editor's own button follows.
				existing: existing || undefined,
			}).unwrap()

			if (!text) {
				toast.error(t("aiWroteNothing"))
				return
			}

			setValue(field, text, { shouldDirty: true, shouldValidate: true })
			setOpen(false)
			setBrief("")
		} catch (error) {
			const message = (error as { data?: { message?: string } })?.data?.message
			toast.error(message ?? t("aiCouldNotWriteThis"))
		}
	}

	return (
		<div className="space-y-1.5">
			<button
				type="button"
				onClick={() => setOpen((value) => !value)}
				disabled={isLoading}
				aria-expanded={open}
				className="text-primary inline-flex items-center gap-1.5 text-xs font-medium disabled:opacity-50"
			>
				{isLoading ? (
					<Loader2 className="size-3.5 animate-spin" />
				) : (
					<Sparkles className="size-3.5" />
				)}
				{isLoading ? t("aiWriting") : t("aiWriteThisWithAi")}
			</button>

			{open && (
				<div className="flex items-center gap-2">
					<input
						type="text"
						autoFocus
						value={brief}
						placeholder={t("aiBriefPlaceholder")}
						disabled={isLoading}
						onChange={(event) => setBrief(event.target.value)}
						onKeyDown={(event) => {
							if (event.key === "Enter") {
								event.preventDefault()
								void write()
							}
							if (event.key === "Escape") setOpen(false)
						}}
						className="border-input bg-background min-w-0 flex-1 rounded-md border px-2 py-1 text-sm outline-none"
					/>
					<button
						type="button"
						onClick={() => void write()}
						disabled={isLoading}
						className="text-primary px-2 py-1 text-sm font-medium disabled:opacity-50"
					>
						{isLoading ? t("aiWriting") : t("aiWrite")}
					</button>
					<button
						type="button"
						onClick={() => setOpen(false)}
						className="text-muted-foreground px-2 py-1 text-sm"
					>
						{t("cancel")}
					</button>
				</div>
			)}
		</div>
	)
}

export default AiFieldButton
