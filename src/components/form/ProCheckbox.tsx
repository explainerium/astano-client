"use client"

import type { ReactNode } from "react"
import { Controller, useFormContext } from "react-hook-form"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"

export interface ProCheckboxProps {
	name: string
	/** ReactNode so consent copy can carry links to the terms and privacy policy. */
	label: ReactNode
	description?: string
	required?: boolean
	disabled?: boolean
	className?: string
}

/**
 * Checkbox laid out beside its label, with the error underneath.
 *
 * Does not use FieldShell: that renders the label above the control, which is
 * right for text inputs and wrong for a checkbox.
 */
export const ProCheckbox = ({
	name,
	label,
	description,
	required,
	disabled,
	className,
}: ProCheckboxProps) => {
	const { control } = useFormContext()

	return (
		<Controller
			control={control}
			name={name}
			render={({ field, fieldState: { error } }) => (
				<div className={cn("space-y-1.5", className)}>
					<div className="flex items-start gap-2.5">
						<Checkbox
							id={name}
							checked={!!field.value}
							onCheckedChange={field.onChange}
							onBlur={field.onBlur}
							disabled={disabled}
							aria-invalid={!!error}
							aria-describedby={error ? `${name}-error` : undefined}
							className="mt-0.5"
						/>
						<label htmlFor={name} className="cursor-pointer text-sm leading-snug">
							{label}
							{required && (
								<span className="text-destructive" aria-hidden>
									{" "}
									*
								</span>
							)}
						</label>
					</div>

					{error ? (
						<p id={`${name}-error`} role="alert" className="text-destructive text-xs">
							{error.message}
						</p>
					) : description ? (
						<p className="text-muted-foreground text-xs">{description}</p>
					) : null}
				</div>
			)}
		/>
	)
}

export default ProCheckbox
