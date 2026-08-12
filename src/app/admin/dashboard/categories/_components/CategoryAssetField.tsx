"use client"

import { useTranslations } from "next-intl"
import { useState } from "react"
import { useController, useFormContext } from "react-hook-form"
import { ImagePlus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import AssetPickerDialog from "@/app/admin/dashboard/products/_components/AssetPickerDialog"
import type { MediaAsset } from "@/types/media"
import { cn } from "@/lib/utils"

/**
 * One optional picture on a category — the banner or the icon.
 *
 * Holds two form values, the id and a preview URL. The id is what gets saved;
 * the URL exists so the field can show what is already chosen without going
 * back to the media library for a row it has already been told about. Keeping
 * the preview in the form rather than in local state means picking an image and
 * pressing Save cannot disagree about which one was picked.
 */
export const CategoryAssetField = ({
	name,
	previewName,
	label,
	description,
	pickerTitle,
	/** Icons are small and square; a banner is not. Only affects the preview box. */
	square,
}: {
	name: string
	previewName: string
	label: string
	description?: string
	pickerTitle: string
	square?: boolean
}) => {
	const t = useTranslations("admin")
	const { control, setValue } = useFormContext()
	const [picking, setPicking] = useState(false)

	const { field } = useController({ control, name })
	const { field: preview } = useController({ control, name: previewName })

	const url = typeof preview.value === "string" ? preview.value : ""

	const choose = (assets: MediaAsset[]) => {
		const asset = assets[0]
		if (!asset) return

		setValue(name, asset.id, { shouldDirty: true })
		// The smallest derivative that exists — this is a thumbnail, and the
		// original can be several megabytes.
		setValue(previewName, asset.derivatives?.thumb ?? asset.derivatives?.grid ?? asset.url ?? "", {
			shouldDirty: true,
		})
		setPicking(false)
	}

	const clear = () => {
		// Null, not undefined. The API treats an omitted field as "leave it alone"
		// and an explicit null as "remove it" — undefined here would silently keep
		// the old picture after the admin pressed the X.
		setValue(name, null, { shouldDirty: true })
		setValue(previewName, "", { shouldDirty: true })
	}

	return (
		<div className="space-y-1.5">
			<Label>{label}</Label>

			<div className="flex items-start gap-3">
				<button
					type="button"
					onClick={() => setPicking(true)}
					className={cn(
						"bg-muted/40 hover:border-primary/50 flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-dashed transition-colors",
						square ? "size-20" : "h-20 w-32"
					)}
					aria-label={url ? `Change ${label.toLowerCase()}` : `Choose ${label.toLowerCase()}`}
				>
					{url ? (
						// Plain img: already a sized derivative, so next/image would
						// re-optimise something that is finished.
						// eslint-disable-next-line @next/next/no-img-element
						<img src={url} alt="" className="size-full object-contain" />
					) : (
						<ImagePlus className="text-muted-foreground size-5" />
					)}
				</button>

				<div className="min-w-0 flex-1 space-y-2">
					{description && <p className="text-muted-foreground text-xs">{description}</p>}

					<div className="flex flex-wrap gap-2">
						<Button type="button" variant="outline" size="sm" onClick={() => setPicking(true)}>
							{url ? "Change" : "Choose"}
						</Button>
						{!!url && (
							<Button type="button" variant="ghost" size="sm" onClick={clear}>
								<X className="size-4" />{t("remove")}</Button>
						)}
					</div>
				</div>
			</div>

			{/* Hidden, because the id is what is saved and nobody types a uuid. */}
			<input type="hidden" {...field} value={typeof field.value === "string" ? field.value : ""} />

			{picking && (
				<AssetPickerDialog
					open
					onOpenChange={(open) => !open && setPicking(false)}
					title={pickerTitle}
					confirmLabel={t("useThis")}
					onConfirm={choose}
				/>
			)}
		</div>
	)
}

export default CategoryAssetField
