"use client"

import { useFormContext } from "react-hook-form"
import ProInput from "@/components/form/ProInput"
import { Button } from "@/components/ui/button"

/** The chips the old admin's "Order Quantity" metabox offered (§4.3.9). */
const PRESETS = [10, 50, 100, 500, 1000]

/**
 * Minimum order quantity.
 *
 * One value per product, applying to everyone — guests, retail customers and
 * approved dealers alike (§4.3.1). The variant-level override still exists in
 * the model; it belongs on the Variations tab, not here, because a product with
 * one variant has nothing to override.
 */
export const MoqField = () => {
	const { setValue, watch } = useFormContext()
	const current = watch("moq") as number | undefined

	const set = (value: number) =>
		setValue("moq", value, { shouldDirty: true, shouldValidate: true })

	return (
		<div className="space-y-3">
			<ProInput
				name="moq"
				type="number"
				label="Minimum order quantity"
				description="Customers cannot buy fewer than this. It applies to every customer, in every language. 0 means no minimum."
				className="sm:max-w-xs"
			/>

			<div className="flex flex-wrap items-center gap-2">
				<span className="text-muted-foreground text-xs">Quick set</span>
				{PRESETS.map((preset) => (
					<Button
						key={preset}
						type="button"
						size="sm"
						variant={current === preset ? "secondary" : "outline"}
						onClick={() => set(preset)}
					>
						{preset}
					</Button>
				))}
				<Button
					type="button"
					size="sm"
					variant={current === 0 ? "secondary" : "outline"}
					onClick={() => set(0)}
				>
					No minimum
				</Button>
			</div>
		</div>
	)
}

export default MoqField
