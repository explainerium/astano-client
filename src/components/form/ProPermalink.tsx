"use client"

import { useState } from "react"
import { Controller, useFormContext, useWatch } from "react-hook-form"
import { Check, ExternalLink, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

/**
 * Turns a name into a slug the way the API will.
 *
 * German umlauts are transliterated rather than stripped — "Ausstechformen für
 * Kühlakkus" has to preview as `…-fuer-kuehlakkus`, not `…-f-r-k-hlakkus`. This
 * is only a preview; the server generates the real slug and de-duplicates it.
 */
const slugify = (value: string): string =>
	value
		.trim()
		.toLowerCase()
		.replace(/ä/g, "ae")
		.replace(/ö/g, "oe")
		.replace(/ü/g, "ue")
		.replace(/ß/g, "ss")
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")

export interface ProPermalinkProps {
	name: string
	/** Field the slug is derived from while it has not been set by hand. */
	sourceName: string
	/** Text before the slug, e.g. "https://astano.de/products/". */
	baseUrl: string
	label?: string
	className?: string
}

/**
 * WordPress's permalink row: the URL shown as text with an Edit button, rather
 * than a slug input sitting open all the time.
 *
 * The slug is derived from the name until someone deliberately changes it —
 * which is the behaviour that keeps URLs sane. An always-editable field invites
 * half-typed slugs; hiding it behind Edit makes changing a live URL a decision
 * rather than an accident.
 */
export const ProPermalink = ({
	name,
	sourceName,
	baseUrl,
	label = "Permalink",
	className,
}: ProPermalinkProps) => {
	const { control, setValue } = useFormContext()
	const [editing, setEditing] = useState(false)
	const [draft, setDraft] = useState("")

	const sourceValue = useWatch({ control, name: sourceName }) as string | undefined

	return (
		<Controller
			control={control}
			name={name}
			render={({ field, fieldState: { error } }) => {
				const current = typeof field.value === "string" ? field.value : ""
				// Falls back to a preview of the name, matching what the server will
				// generate if nothing is sent.
				const shown = current || slugify(sourceValue ?? "")

				const commit = () => {
					setValue(name, slugify(draft), { shouldDirty: true, shouldValidate: true })
					setEditing(false)
				}

				if (editing) {
					return (
						<div className={className}>
							<div className="flex flex-wrap items-center gap-2 text-sm">
								<span className="text-muted-foreground">{label}:</span>
								<span className="text-muted-foreground font-mono text-xs">{baseUrl}</span>
								<Input
									autoFocus
									value={draft}
									onChange={(event) => setDraft(event.target.value)}
									onKeyDown={(event) => {
										if (event.key === "Enter") {
											event.preventDefault()
											commit()
										}
										if (event.key === "Escape") setEditing(false)
									}}
									className="h-8 w-56 font-mono text-xs"
									aria-label="Edit permalink"
								/>
								<Button type="button" size="sm" onClick={commit}>
									<Check />
									OK
								</Button>
								<Button
									type="button"
									size="sm"
									variant="ghost"
									onClick={() => setEditing(false)}
								>
									<X />
									Cancel
								</Button>
							</div>
							{error?.message && (
								<p role="alert" className="text-destructive mt-1 text-xs">
									{error.message}
								</p>
							)}
						</div>
					)
				}

				return (
					<div className={className}>
						<div className="flex flex-wrap items-center gap-2 text-sm">
							<span className="text-muted-foreground">{label}:</span>

							{shown ? (
								<a
									href={`${baseUrl}${shown}`}
									target="_blank"
									rel="noopener noreferrer"
									className="inline-flex items-center gap-1 font-mono text-xs underline underline-offset-2"
								>
									{baseUrl}
									<strong className="font-semibold">{shown}</strong>
									<ExternalLink className="size-3" />
								</a>
							) : (
								<span className="text-muted-foreground text-xs italic">
									generated from the name
								</span>
							)}

							<Button
								type="button"
								size="sm"
								variant="outline"
								onClick={() => {
									setDraft(shown)
									setEditing(true)
								}}
							>
								Edit
							</Button>
						</div>
						{error?.message && (
							<p role="alert" className="text-destructive mt-1 text-xs">
								{error.message}
							</p>
						)}
					</div>
				)
			}}
		/>
	)
}

export default ProPermalink
