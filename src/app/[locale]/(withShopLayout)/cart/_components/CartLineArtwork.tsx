"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { AlertCircle } from "lucide-react"
import ArtworkUpload from "@/components/shared/ArtworkUpload"
import { useSetCartItemFilesMutation } from "@/redux/api/storefrontApi"
import type { ArtworkFile, ArtworkRules } from "@/types/storefront"

/**
 * The design files on one cart line.
 *
 * Separate from the line itself because it saves: the product page attaches
 * files as the line is created, but a customer who reached the cart without one
 * — or who picked the wrong drawing — has to be able to fix it here. Every
 * change writes immediately, so there is no "save" the customer can forget.
 */

const apiMessage = (error: unknown) => (error as { data?: { message?: string } })?.data?.message

interface Props {
	itemId: string
	files: ArtworkFile[]
	artwork: ArtworkRules
	missing: boolean
}

const CartLineArtwork = ({ itemId, files, artwork, missing }: Props) => {
	const t = useTranslations("artwork")
	const [setFiles, { isLoading }] = useSetCartItemFilesMutation()
	const [error, setError] = useState<string | null>(null)

	/*
	 * Only where a drawing is actually required.
	 *
	 * A product that merely tolerates one used to render an empty box on every
	 * line, which read as a demand rather than an offer. A line that already
	 * carries files still shows them, so nothing already attached disappears.
	 */
	if (artwork.maxFiles <= 0 || (!artwork.required && files.length === 0)) return null

	const handleChange = async (next: ArtworkFile[]) => {
		setError(null)
		try {
			await setFiles({ id: itemId, assetIds: next.map((file) => file.id) }).unwrap()
		} catch (cause) {
			// The cart refetches on invalidation, so a failed save simply leaves
			// the list as the server has it — nothing to roll back by hand.
			setError(apiMessage(cause) ?? t("saveFailed"))
		}
	}

	return (
		<div className="mt-3 border-t pt-3">
			<p className="mb-2 text-sm font-medium">
				{t("attached")}
				{artwork.required && <span className="text-destructive ml-1">*</span>}
			</p>

			{missing && (
				<p className="text-destructive mb-2 flex items-center gap-2 text-sm">
					<AlertCircle className="size-4 shrink-0" />
					{t("missing")}
				</p>
			)}

			<ArtworkUpload
				files={files}
				onChange={(next) => void handleChange(next)}
				maxFiles={artwork.maxFiles}
				required={artwork.required}
				busy={isLoading}
			/>

			{error && <p className="text-destructive mt-2 text-sm">{error}</p>}
		</div>
	)
}

export default CartLineArtwork
