import type { ReactNode } from "react"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

export interface FieldShellProps {
	name: string
	label?: string
	description?: string
	error?: string
	required?: boolean
	className?: string
	children: ReactNode
}

/**
 * Label, control, hint and error in one stack.
 *
 * Every Pro* field renders through this, so a field can never end up with its
 * label wired to the wrong control or its error message styled differently
 * from the field next to it. The MUI TextField the healthcare project used did
 * the same job internally; shadcn's primitives are unbundled, so it lives here.
 */
export const FieldShell = ({
	name,
	label,
	description,
	error,
	required,
	className,
	children,
}: FieldShellProps) => (
	<div className={cn("space-y-1.5", className)}>
		{label && (
			<Label htmlFor={name}>
				{label}
				{required && (
					<span className="text-destructive" aria-hidden>
						*
					</span>
				)}
			</Label>
		)}

		{children}

		{/* The hint disappears once there is an error — two competing lines of
		    small print under one field is noise at the moment it matters most. */}
		{error ? (
			<p id={`${name}-error`} role="alert" className="text-destructive text-xs">
				{error}
			</p>
		) : description ? (
			<p id={`${name}-description`} className="text-muted-foreground text-xs">
				{description}
			</p>
		) : null}
	</div>
)

export default FieldShell
