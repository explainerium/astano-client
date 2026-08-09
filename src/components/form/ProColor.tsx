"use client"

import { Controller, useFormContext } from "react-hook-form"
import { Input } from "@/components/ui/input"
import FieldShell from "./FieldShell"

/**
 * A colour, as a swatch and as a hex field.
 *
 * Both, not either. The native picker is the fast way to choose one and the
 * only way to browse; the text box is the only way to paste the exact brand
 * colour somebody was given, which is how this setting is usually filled in.
 *
 * The value stored is always the text in the box. The backend accepts hex only
 * and falls back to its default on anything else, so a half-typed `#ab` is
 * harmless — it simply does not take effect.
 */
export const ProColor = ({
	name,
	label,
	description,
}: {
	name: string
	label?: string
	description?: string
}) => {
	const { control } = useFormContext()

	return (
		<Controller
			control={control}
			name={name}
			render={({ field, fieldState: { error } }) => {
				const value = typeof field.value === "string" ? field.value : ""

				// The swatch cannot render a partial value, and feeding it one makes
				// it jump to black while somebody is still typing.
				const swatch = /^#[0-9a-f]{6}$/i.test(value) ? value : "#000000"

				return (
					<FieldShell name={name} label={label} description={description} error={error?.message}>
						<div className="flex items-center gap-2">
							<input
								type="color"
								value={swatch}
								onChange={(event) => field.onChange(event.target.value)}
								aria-label={label ? `${label} colour picker` : "Colour picker"}
								className="border-input size-9 shrink-0 cursor-pointer rounded-md border bg-transparent p-1"
							/>
							<Input
								{...field}
								id={name}
								value={value}
								placeholder="#272727"
								spellCheck={false}
								className="font-mono"
								aria-invalid={!!error}
							/>
						</div>
					</FieldShell>
				)
			}}
		/>
	)
}

export default ProColor
