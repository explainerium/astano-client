"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { AlertCircle } from "lucide-react"
import ArtworkUpload from "@/components/shared/ArtworkUpload"
import { useSetCartItemFilesMutation } from "@/redux/api/storefrontApi"
import type { ArtworkFile, CartLine } from "@/types/storefront"

/**
 * The design file for one line, asked for inside Your Order.
 *
 * It used to be asked for on the cart page, and then briefly in a section of
 * its own above the billing address. Both put the question somewhere other than
 * next to the thing it is about: a customer with four items and one engraved
 * cutter had to work out which upload belonged to which line. Here the field
 * sits under the line it belongs to and needs no label to say so.
 *
 * Saves on every change. There is no button to forget, and the cart refetches
 * on its own, so a failed save simply leaves the list as the server has it —
 * nothing to roll back by hand.
 */

const apiMessage = (error: unknown) => (error as { data?: { message?: string } })?.data?.message

/** A line or one of its options — both carry files and both can require them. */
export type ArtworkLine = Omit<CartLine, "options">

/**
 * Whether this line is one the customer has to do something about.
 *
 * A product that merely tolerates a file is left alone unless something is
 * already attached: an empty box on every line reads as a demand rather than an
 * offer, and in a totals panel it would bury the totals.
 */
export const wantsArtwork = (line: ArtworkLine): boolean =>
	line.artwork.maxFiles > 0 && (line.artwork.required || line.files.length > 0)

export const LineArtwork = ({ line }: { line: ArtworkLine }) => {
	const t = useTranslations("artwork")
	const [setFiles, { isLoading }] = useSetCartItemFilesMutation()
	const [error, setError] = useState<string | null>(null)

	const save = async (next: ArtworkFile[]) => {
		setError(null)
		try {
			await setFiles({ id: line.id, assetIds: next.map((file) => file.id) }).unwrap()
		} catch (cause) {
			setError(apiMessage(cause) ?? t("saveFailed"))
		}
	}

	return (
		<div className="bg-background mt-3 border p-3">
			{/*
			 * No heading. The product name is directly above it and the summary
			 * says it once at the top — a box that announced "Your design files"
			 * on every line would be the same three words repeated down the panel.
			 *
			 * The missing warning stays, because that one is about this line.
			 */}
			{line.artworkMissing && (
				<p className="text-destructive mb-2 flex items-start gap-2 text-xs">
					<AlertCircle className="mt-px size-3.5 shrink-0" />
					{t("missing")}
				</p>
			)}

			<ArtworkUpload
				files={line.files}
				onChange={(next) => void save(next)}
				maxFiles={line.artwork.maxFiles}
				required={line.artwork.required}
				busy={isLoading}
				// The formats and the reason are printed once by the summary above.
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

export default LineArtwork
