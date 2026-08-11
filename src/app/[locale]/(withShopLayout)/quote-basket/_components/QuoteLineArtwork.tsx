"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { AlertCircle } from "lucide-react"
import ArtworkUpload from "@/components/shared/ArtworkUpload"
import { useSetQuoteItemFilesMutation } from "@/redux/api/storefrontApi"
import type { ArtworkFile, ArtworkRules } from "@/types/storefront"

/**
 * The design files on one inquiry-basket line.
 *
 * The cart's twin, and needed more than the cart's: the made-to-order half of
 * the catalogue is exactly the half that is priced on request, so this is where
 * most drawings arrive. Staff cannot answer a quote for a shape they have not
 * seen, which is why a missing file blocks submission rather than warning.
 */

const apiMessage = (error: unknown) => (error as { data?: { message?: string } })?.data?.message

interface Props {
	itemId: string
	files: ArtworkFile[]
	artwork: ArtworkRules
	missing: boolean
}

const QuoteLineArtwork = ({ itemId, files, artwork, missing }: Props) => {
	const t = useTranslations("artwork")
	const [setFiles, { isLoading }] = useSetQuoteItemFilesMutation()
	const [error, setError] = useState<string | null>(null)

	if (artwork.maxFiles <= 0) return null

	const handleChange = async (next: ArtworkFile[]) => {
		setError(null)
		try {
			await setFiles({ id: itemId, assetIds: next.map((file) => file.id) }).unwrap()
		} catch (cause) {
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

export default QuoteLineArtwork
