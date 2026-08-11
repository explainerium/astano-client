"use client"

import { useState } from "react"
import { Download, FileText, Loader2 } from "lucide-react"
import { useLazySignedMediaUrlQuery } from "@/redux/api/mediaApi"

/**
 * The design files frozen onto an order or quote line, as download links.
 *
 * The file itself lives in the private bucket, so there is no URL to render
 * directly — one is signed on demand and expires. That is deliberate: a
 * customer's drawing is theirs, and a link in a page that stays valid forever
 * is a link that outlives whoever was allowed to hold it.
 *
 * A line whose upload has since been deleted still lists the name. The order is
 * a record of what was sent, and erasing the row would quietly rewrite it.
 */

interface Props {
	files: { id: string; assetId: string | null; name: string }[]
	labels: { download: string; deleted: string; none?: string }
}

const ArtworkLinks = ({ files, labels }: Props) => {
	const [fetchUrl] = useLazySignedMediaUrlQuery()
	const [pending, setPending] = useState<string | null>(null)

	if (!files.length) return labels.none ? <span className="text-xs">{labels.none}</span> : null

	const open = async (assetId: string) => {
		setPending(assetId)
		try {
			const { url } = await fetchUrl(assetId).unwrap()
			// A new tab, not a navigation: the signed link is a download, and
			// replacing the order page with it loses the staff member's place.
			window.open(url, "_blank", "noopener,noreferrer")
		} finally {
			setPending(null)
		}
	}

	return (
		<ul className="space-y-1">
			{files.map((file) => (
				<li key={file.id} className="flex items-center gap-2 text-xs">
					<FileText className="text-muted-foreground size-3.5 shrink-0" />
					<span className="min-w-0 truncate" title={file.name}>
						{file.name}
					</span>
					{file.assetId ? (
						<button
							type="button"
							disabled={pending === file.assetId}
							onClick={() => void open(file.assetId!)}
							className="text-primary inline-flex shrink-0 items-center gap-1 underline underline-offset-2 disabled:opacity-50"
						>
							{pending === file.assetId ? (
								<Loader2 className="size-3 animate-spin" />
							) : (
								<Download className="size-3" />
							)}
							{labels.download}
						</button>
					) : (
						<span className="text-muted-foreground shrink-0">{labels.deleted}</span>
					)}
				</li>
			))}
		</ul>
	)
}

export default ArtworkLinks
