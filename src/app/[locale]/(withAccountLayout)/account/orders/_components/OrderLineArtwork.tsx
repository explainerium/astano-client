"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Info } from "lucide-react"
import ArtworkUpload from "@/components/shared/ArtworkUpload"
import { useSetOrderItemFilesMutation } from "@/redux/api/storefrontApi"
import type { ArtworkFile, OrderItem } from "@/types/storefront"

/**
 * Sending the drawing after the order has already been placed.
 *
 * The client's rule is that print files may follow the order — checkout asks
 * for them but never blocks — and until now "follow" meant emailing them to the
 * shop, where they never joined the order record. This is the channel the
 * client asked for: the customer opens the order and attaches the file to the
 * line it belongs to. Staff are emailed a link to the order, not to the file.
 *
 * The same upload control as checkout, deliberately. It is the one the client
 * said was good, and a second field that behaves differently in the account
 * would be a second thing to learn for the same job.
 */

const apiMessage = (error: unknown) => (error as { data?: { message?: string } })?.data?.message

/** A line or one of its options — both are products and both take drawings. */
export type ArtworkOrderLine = Omit<OrderItem, "options">

/**
 * The attached files as the upload control wants them.
 *
 * A row whose upload has since been deleted is dropped rather than listed: it
 * has no asset id to re-send, so it cannot be part of a set the customer edits.
 * The order still records that it was there — that is what the note on the
 * order thread is for.
 */
const asUploadFiles = (line: ArtworkOrderLine): ArtworkFile[] =>
	line.files
		.filter((file) => file.assetId)
		.map((file) => ({
			id: file.assetId!,
			name: file.name,
			sizeBytes: file.sizeBytes ?? 0,
			uploadedAt: file.uploadedAt ?? "",
		}))

export const OrderLineArtwork = ({
	orderId,
	line,
}: {
	orderId: string
	line: ArtworkOrderLine
}) => {
	const t = useTranslations("artwork")
	const [setFiles, { isLoading }] = useSetOrderItemFilesMutation()
	const [error, setError] = useState<string | null>(null)

	// Nothing to offer: either the product takes no drawings, or the order has
	// moved past the point where one would change anything.
	if (!line.canAttachArtwork) return null

	const save = async (next: ArtworkFile[]) => {
		setError(null)
		try {
			await setFiles({ orderId, itemId: line.id, assetIds: next.map((f) => f.id) }).unwrap()
		} catch (cause) {
			setError(apiMessage(cause) ?? t("saveFailed"))
		}
	}

	return (
		<div className="bg-muted/40 mt-3 border p-3">
			{/*
			 * Said only while the line is still waiting. Once something is
			 * attached the list of files is the answer, and a standing note above
			 * it would be telling the customer to do what they have just done.
			 */}
			{line.files.length === 0 && (
				<p className="text-muted-foreground mb-2 flex items-start gap-2 text-xs">
					<Info className="mt-px size-3.5 shrink-0" />
					{t("sendLaterHere")}
				</p>
			)}

			<ArtworkUpload
				files={asUploadFiles(line)}
				onChange={(next) => void save(next)}
				maxFiles={line.artwork.maxFiles}
				required={line.artwork.required}
				busy={isLoading}
				// The formats are printed by the control itself; the reason a file
				// is wanted was made at checkout and does not need repeating here.
				explain={false}
			/>

			{error && (
				<p className="text-destructive mt-2 text-xs" role="alert">
					{error}
				</p>
			)}
		</div>
	)
}

export default OrderLineArtwork
