"use client"

import { useTranslations } from "next-intl"
import { useController, useFormContext } from "react-hook-form"
import { ChevronDown, ChevronUp, Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { ContentDefinition } from "@/types/content"

/**
 * A list the shop may lengthen, shorten and reorder — the FAQ, today.
 *
 * Held in the form as one JSON string, in the field the rest of this screen
 * already uses for a value. That keeps it inside the machinery that decides
 * what changed and what to send: a list is a value like any other, and the fact
 * that it happens to be a value with rows in it stops at this component.
 *
 * Per language, unlike a picture. A German question and its English translation
 * are different sentences, and the shop may well have nine of one and ten of
 * the other while it catches up.
 */

type Row = Record<string, string>

const parse = (value: unknown): Row[] => {
	if (typeof value !== "string" || !value.trim()) return []
	try {
		const parsed: unknown = JSON.parse(value)
		return Array.isArray(parsed) ? (parsed as Row[]) : []
	} catch {
		return []
	}
}

export const ContentListField = ({
	name,
	label,
	definition,
}: {
	name: string
	label: string
	definition: ContentDefinition
}) => {
	const t = useTranslations("admin")
	const { control } = useFormContext()
	const { field } = useController({ control, name })

	const fields = definition.fields ?? []
	const rows = parse(field.value)

	/** Every change rewrites the whole value — there is only ever one. */
	const write = (next: Row[]) => field.onChange(JSON.stringify(next))

	const update = (index: number, key: string, value: string) =>
		write(rows.map((row, i) => (i === index ? { ...row, [key]: value } : row)))

	const add = () =>
		write([...rows, Object.fromEntries(fields.map((f) => [f.name, ""])) as Row])

	const remove = (index: number) => write(rows.filter((_, i) => i !== index))

	/** Reordering matters here: the FAQ is read top to bottom. */
	const move = (index: number, by: number) => {
		const to = index + by
		if (to < 0 || to >= rows.length) return
		const next = [...rows]
		const [row] = next.splice(index, 1)
		if (row) next.splice(to, 0, row)
		write(next)
	}

	return (
		<div className="space-y-3">
			<div className="flex items-center justify-between gap-3">
				<Label>{label}</Label>
				<span className="text-muted-foreground text-xs">
					{t("itemCount", { count: rows.length })}
				</span>
			</div>

			{rows.length === 0 && (
				<p className="text-muted-foreground bg-muted/40 rounded-md border border-dashed p-4 text-xs">
					{t("noItemsYet")}
				</p>
			)}

			{rows.map((row, index) => (
				<div key={index} className="bg-muted/30 space-y-3 rounded-md border p-4">
					<div className="flex items-center justify-between gap-2">
						<span className="text-muted-foreground text-xs font-medium">{index + 1}</span>

						<div className="flex items-center gap-1">
							<Button
								type="button"
								variant="ghost"
								size="icon"
								className="size-7"
								disabled={index === 0}
								onClick={() => move(index, -1)}
								aria-label={t("moveUp")}
							>
								<ChevronUp className="size-4" />
							</Button>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								className="size-7"
								disabled={index === rows.length - 1}
								onClick={() => move(index, 1)}
								aria-label={t("moveDown")}
							>
								<ChevronDown className="size-4" />
							</Button>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								className="text-destructive size-7"
								onClick={() => remove(index)}
								aria-label={t("removeItem")}
							>
								<X className="size-4" />
							</Button>
						</div>
					</div>

					{fields.map((f) => (
						<div key={f.name} className="space-y-1.5">
							<Label className="text-xs font-normal">{f.label}</Label>
							{f.type === "textarea" ? (
								<Textarea
									rows={3}
									value={row[f.name] ?? ""}
									onChange={(event) => update(index, f.name, event.target.value)}
								/>
							) : (
								<Input
									value={row[f.name] ?? ""}
									onChange={(event) => update(index, f.name, event.target.value)}
								/>
							)}
						</div>
					))}
				</div>
			))}

			<Button type="button" variant="outline" size="sm" onClick={add}>
				<Plus className="size-4" />
				{t("addItem")}
			</Button>
		</div>
	)
}

export default ContentListField
