"use client"

import { Controller, useFormContext } from "react-hook-form"
import { Input } from "@/components/ui/input"
import FieldShell from "./FieldShell"

export interface ProInputProps {
	name: string
	label?: string
	type?: React.HTMLInputTypeAttribute
	placeholder?: string
	description?: string
	required?: boolean
	disabled?: boolean
	autoComplete?: string
	className?: string
}

export const ProInput = ({
	name,
	label,
	type = "text",
	placeholder,
	description,
	required,
	disabled,
	autoComplete,
	className,
}: ProInputProps) => {
	const { control } = useFormContext()

	return (
		<Controller
			control={control}
			name={name}
			render={({ field, fieldState: { error } }) => (
				<FieldShell
					name={name}
					label={label}
					description={description}
					error={error?.message}
					required={required}
					className={className}
				>
					<Input
						{...field}
						id={name}
						type={type}
						placeholder={placeholder}
						disabled={disabled}
						autoComplete={autoComplete}
						aria-invalid={!!error}
						aria-describedby={error ? `${name}-error` : description ? `${name}-description` : undefined}
						// `?? ""` keeps the input controlled from the first render.
						// Without it, a field missing from defaultValues starts as
						// undefined and React logs the uncontrolled-to-controlled
						// warning the moment the user types.
						value={field.value ?? ""}
						onChange={(event) => {
							if (type !== "number") return field.onChange(event.target.value)
							// Numbers must reach the API as numbers. MOQ, tier
							// quantities and prices all validate as numeric, and a
							// string "100" fails Zod's number check on the server.
							// Empty stays undefined so "required" still triggers.
							const raw = event.target.value
							field.onChange(raw === "" ? undefined : event.target.valueAsNumber)
						}}
					/>
				</FieldShell>
			)}
		/>
	)
}

export default ProInput
