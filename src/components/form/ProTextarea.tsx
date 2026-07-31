"use client"

import { Controller, useFormContext } from "react-hook-form"
import { Textarea } from "@/components/ui/textarea"
import FieldShell from "./FieldShell"

export interface ProTextareaProps {
	name: string
	label?: string
	placeholder?: string
	description?: string
	required?: boolean
	disabled?: boolean
	rows?: number
	className?: string
}

export const ProTextarea = ({
	name,
	label,
	placeholder,
	description,
	required,
	disabled,
	rows = 4,
	className,
}: ProTextareaProps) => {
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
					<Textarea
						{...field}
						id={name}
						rows={rows}
						placeholder={placeholder}
						disabled={disabled}
						aria-invalid={!!error}
						aria-describedby={error ? `${name}-error` : description ? `${name}-description` : undefined}
						value={field.value ?? ""}
					/>
				</FieldShell>
			)}
		/>
	)
}

export default ProTextarea
