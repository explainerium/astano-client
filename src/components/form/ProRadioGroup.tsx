"use client"

import { Controller, useFormContext } from "react-hook-form"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { cn } from "@/lib/utils"

export interface ProRadioOption {
	label: string
	value: string
}

export interface ProRadioGroupProps {
	name: string
	options: ProRadioOption[]
	label?: string
	description?: string
	required?: boolean
	disabled?: boolean
	/** Horizontal suits two options; stack anything longer. */
	orientation?: "horizontal" | "vertical"
	className?: string
}

/**
 * Radio group.
 *
 * Rendered as a fieldset with a legend rather than through FieldShell: a group
 * label belongs to the whole set, and a <label for> pointing at one of several
 * inputs would announce the wrong thing to a screen reader.
 */
export const ProRadioGroup = ({
	name,
	options,
	label,
	description,
	required,
	disabled,
	orientation = "horizontal",
	className,
}: ProRadioGroupProps) => {
	const { control } = useFormContext()

	return (
		<Controller
			control={control}
			name={name}
			render={({ field, fieldState: { error } }) => (
				<fieldset className={cn("space-y-1.5", className)}>
					{label && (
						<legend className="mb-1.5 text-sm leading-none font-medium">
							{label}
							{required && (
								<span className="text-destructive" aria-hidden>
									{" "}
									*
								</span>
							)}
						</legend>
					)}

					<RadioGroup
						value={field.value ?? ""}
						onValueChange={field.onChange}
						disabled={disabled}
						aria-invalid={!!error}
						aria-describedby={error ? `${name}-error` : undefined}
						className={orientation === "horizontal" ? "flex flex-wrap gap-6" : "grid gap-2"}
					>
						{options.map((option) => (
							<div key={option.value} className="flex items-center gap-2">
								<RadioGroupItem id={`${name}-${option.value}`} value={option.value} />
								<label
									htmlFor={`${name}-${option.value}`}
									className="cursor-pointer text-sm"
								>
									{option.label}
								</label>
							</div>
						))}
					</RadioGroup>

					{error ? (
						<p id={`${name}-error`} role="alert" className="text-destructive text-xs">
							{error.message}
						</p>
					) : description ? (
						<p className="text-muted-foreground text-xs">{description}</p>
					) : null}
				</fieldset>
			)}
		/>
	)
}

export default ProRadioGroup
