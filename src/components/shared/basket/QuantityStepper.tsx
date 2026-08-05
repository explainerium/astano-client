"use client"

import { useState } from "react"
import { Minus, Plus } from "lucide-react"

/**
 * Quantity control for a basket line.
 *
 * Typing is held locally and committed on blur or Enter, so a three-digit
 * number does not fire a request per digit — and, more importantly, so that
 * passing through "1" on the way to "100" never lands a below-MOQ quantity on
 * the server. The steppers commit immediately, since a click is already a
 * finished intention.
 *
 * `min` is the line's MOQ. The value can still be pushed below it by typing,
 * because the basket has to be able to *show* an invalid line rather than
 * silently correcting one the customer put there (R4).
 */
export const QuantityStepper = ({
	value,
	min,
	max,
	disabled,
	onCommit,
}: {
	value: number
	min: number
	max?: number | null
	disabled?: boolean
	onCommit: (quantity: number) => void
}) => {
	const [draft, setDraft] = useState<string | null>(null)

	const commit = (next: number) => {
		setDraft(null)
		const clamped = max ? Math.min(next, max) : next
		if (clamped !== value && clamped > 0) onCommit(clamped)
	}

	return (
		<div className="inline-flex border">
			<button
				type="button"
				onClick={() => commit(Math.max(min, value - 1))}
				disabled={disabled || value <= min}
				aria-label="-"
				className="px-2.5 py-2 disabled:opacity-40"
			>
				<Minus className="size-3.5" />
			</button>

			<input
				type="number"
				inputMode="numeric"
				min={min}
				value={draft ?? value}
				disabled={disabled}
				onChange={(event) => setDraft(event.target.value)}
				onBlur={() => commit(Number(draft ?? value) || min)}
				onKeyDown={(event) => {
					if (event.key === "Enter") event.currentTarget.blur()
				}}
				className="w-16 border-x px-1 py-2 text-center text-sm outline-none"
			/>

			<button
				type="button"
				onClick={() => commit(value + 1)}
				disabled={disabled || (max ? value >= max : false)}
				aria-label="+"
				className="px-2.5 py-2 disabled:opacity-40"
			>
				<Plus className="size-3.5" />
			</button>
		</div>
	)
}

export default QuantityStepper
