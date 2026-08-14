"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Info } from "lucide-react"
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
 * Whether this line can take a design file at all.
 *
 * Every product the shop marked as taking files gets the field, not only the
 * ones marked as needing one. That is the client's rule: the box is an offer,
 * so a product that accepts a drawing should say so rather than stay silent
 * until somebody already guessed.
 */
export const wantsArtwork = (line: ArtworkLine): boolean => line.artwork.maxFiles > 0

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
			 * No heading: the product name is directly above it, and a box that
			 * announced "Your design files" on every line would be the same three
			 * words repeated down the panel.
			 */}

			{/*
			 * What this line is waiting for, said as a note rather than a refusal.
			 *
			 * A product marked as needing a drawing says so more firmly, but
			 * neither wording stops the order: files may follow it. Nothing is
			 * printed once something is attached — the list of files is the
			 * answer at that point.
			 */}
			{line.files.length === 0 && (
				<p className="text-muted-foreground mb-2 flex items-start gap-2 text-xs">
					<Info className="mt-px size-3.5 shrink-0" />
					{line.artwork.required ? t("expectedOrLater") : t("optionalOrLater")}
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
