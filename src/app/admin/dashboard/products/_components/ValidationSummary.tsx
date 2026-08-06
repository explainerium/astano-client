"use client"

import { useFormContext, useFormState } from "react-hook-form"
import { AlertCircle } from "lucide-react"

/**
 * Which tab each field lives on. Anything not listed is on General.
 *
 * This exists because the product editor spreads one form across five tabs and
 * shadcn's Tabs unmounts the panels it is not showing. A required field on a
 * tab the user never opened fails validation with its error message attached
 * to an input that is not in the DOM — so Save appears to do nothing at all.
 * No toast, no network request, nothing in the console.
 *
 * That is exactly what happened with `sku`: it is required, it defaults to
 * empty on create, and it lives on Inventory. Filling in a name and a price on
 * General and pressing Create silently failed.
 */
const FIELD_TAB: Record<string, string> = {
	sku: "inventory",
	manageStock: "inventory",
	stock: "inventory",
	allowBackorder: "inventory",
	weightKg: "shipping",
	lengthCm: "shipping",
	widthCm: "shipping",
	heightCm: "shipping",
	attributes: "attributes",
	options: "options",
}

/** Field names as the form labels them, so the message matches what is on screen. */
const FIELD_LABEL: Record<string, string> = {
	sku: "SKU",
	stock: "Stock quantity",
	weightKg: "Weight",
	lengthCm: "Length",
	widthCm: "Width",
	heightCm: "Height",
	moq: "Minimum order quantity",
	sortOrder: "Sort order",
	tiers: "Quantity discounts",
	prices: "Pricing",
	attributes: "Attributes",
	options: "Options",
	en: "English content",
	de: "German content",
}

const TAB_LABEL: Record<string, string> = {
	general: "General",
	inventory: "Inventory",
	shipping: "Shipping",
	attributes: "Attributes",
	options: "Options",
}

/** Pulls the first human-readable message out of a nested RHF error node. */
const firstMessage = (node: unknown): string | null => {
	if (!node || typeof node !== "object") return null
	const record = node as Record<string, unknown> & { message?: unknown }
	if (typeof record.message === "string") return record.message
	for (const value of Object.values(record)) {
		const found = firstMessage(value)
		if (found) return found
	}
	return null
}

/**
 * Lists every validation error above the Save button, each one a button that
 * opens the tab holding it.
 *
 * Rendered from formState rather than an effect, so there is no state to keep
 * in sync — it simply is not there until a submit has failed.
 */
export const ValidationSummary = ({ onJump }: { onJump: (tab: string) => void }) => {
	/**
	 * `useFormState({ control })`, not `useFormContext().formState`.
	 *
	 * The latter is the same trap as `watch()`: the subscription belongs to the
	 * component that owns `useForm` — ProForm, several levels up — and its
	 * children are stable element references, so React bails out of re-rendering
	 * this leaf. The summary computed correctly and was never painted. Only the
	 * dedicated hook subscribes the component that calls it.
	 */
	const { control } = useFormContext()
	const { errors, submitCount } = useFormState({ control })

	if (!submitCount || !Object.keys(errors).length) return null

	const items = Object.entries(errors).map(([field, node]) => ({
		field,
		tab: FIELD_TAB[field] ?? "general",
		label: FIELD_LABEL[field] ?? field,
		message: firstMessage(node) ?? "Please check this field",
	}))

	return (
		<div
			role="alert"
			className="border-destructive/40 bg-destructive/5 text-destructive rounded-lg border p-4 text-sm"
		>
			<p className="flex items-center gap-2 font-semibold">
				<AlertCircle className="size-4 shrink-0" />
				This product could not be saved
			</p>

			<ul className="mt-2 space-y-1">
				{items.map((item) => (
					<li key={item.field}>
						<button
							type="button"
							onClick={() => onJump(item.tab)}
							className="text-left underline underline-offset-2"
						>
							{item.label}: {item.message}
							{item.tab !== "general" && (
								<span className="ml-1 opacity-70">({TAB_LABEL[item.tab]} tab)</span>
							)}
						</button>
					</li>
				))}
			</ul>
		</div>
	)
}

export default ValidationSummary
