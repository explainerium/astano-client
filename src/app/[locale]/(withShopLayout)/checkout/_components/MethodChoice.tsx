"use client"

import { cn } from "@/lib/utils"

export interface MethodOption {
	id: string
	title: string
	/** Right-hand column — a price for delivery, nothing for payment. */
	trailing?: string
	description?: string | null
	disabled?: boolean
	/** Shown when disabled: why this option is closed to this customer. */
	disabledReason?: string
}

/**
 * Radio list for delivery and payment methods.
 *
 * Ineligible options stay visible rather than being filtered out, with the
 * reason next to them — a customer who cannot pay by invoice is better served
 * by "available from your second order onwards" than by an option that simply
 * is not there.
 */
export const MethodChoice = ({
	name,
	options,
	value,
	onChange,
}: {
	name: string
	options: MethodOption[]
	value: string | null
	onChange: (id: string) => void
}) => (
	<ul className="space-y-2">
		{options.map((option) => (
			<li key={option.id}>
				<label
					className={cn(
						"flex cursor-pointer items-start gap-3 border p-4 transition-colors",
						option.disabled
							? "cursor-not-allowed opacity-60"
							: value === option.id
								? "border-primary"
								: "hover:border-neutral-400"
					)}
				>
					<input
						type="radio"
						name={name}
						value={option.id}
						checked={value === option.id}
						disabled={option.disabled}
						onChange={() => onChange(option.id)}
						className="mt-0.5 shrink-0"
					/>
					<span className="flex-1 text-sm">
						<span className="font-medium">{option.title}</span>
						{option.description && (
							<span className="text-muted-foreground mt-0.5 block text-xs leading-relaxed">
								{option.description}
							</span>
						)}
						{option.disabled && option.disabledReason && (
							<span className="text-muted-foreground mt-0.5 block text-xs">
								{option.disabledReason}
							</span>
						)}
					</span>
					{option.trailing && <span className="text-sm font-semibold">{option.trailing}</span>}
				</label>
			</li>
		))}
	</ul>
)

export default MethodChoice
