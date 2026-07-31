"use client"

import { Controller, useFormContext } from "react-hook-form"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import FieldShell from "./FieldShell"

export interface ProSelectOption {
	label: string
	value: string
	disabled?: boolean
}

export interface ProSelectProps {
	name: string
	options: ProSelectOption[]
	label?: string
	placeholder?: string
	description?: string
	required?: boolean
	disabled?: boolean
	className?: string
}

export const ProSelect = ({
	name,
	options,
	label,
	placeholder = "Select…",
	description,
	required,
	disabled,
	className,
}: ProSelectProps) => {
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
					{/* Radix Select is string-only. Values that are numbers or enums
					    in the payload are stringified here and converted back by the
					    caller's Zod schema (z.coerce.number(), z.enum(...)). */}
					<Select
						value={field.value == null ? undefined : String(field.value)}
						onValueChange={field.onChange}
						disabled={disabled}
					>
						<SelectTrigger
							id={name}
							className="w-full"
							aria-invalid={!!error}
							aria-describedby={
								error ? `${name}-error` : description ? `${name}-description` : undefined
							}
						>
							<SelectValue placeholder={placeholder} />
						</SelectTrigger>
						<SelectContent>
							{options.map((option) => (
								<SelectItem
									key={option.value}
									value={option.value}
									disabled={option.disabled}
								>
									{option.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</FieldShell>
			)}
		/>
	)
}

export default ProSelect
