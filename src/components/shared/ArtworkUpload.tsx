"use client"

import { useId, useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { FileText, Loader2, Paperclip, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import useUserInfo from "@/hooks/useUserInfo"
import { useUploadArtworkMutation } from "@/redux/api/mediaApi"
import type { ArtworkFile } from "@/types/storefront"
import { cn } from "@/lib/utils"

/**
 * The design files a made-to-order line is cut from.
 *
 * astano makes a good part of its catalogue to a customer drawing — a cutter in
 * the shape of a logo, an engraving, a printed sleeve — so for those products
 * this file *is* the specification. The old shop put the same field on the
 * product page and carried the files to the order; this is that field.
 *
 * Uploading and attaching are two separate steps on the server: the file is
 * stored first and only then pointed at a line. This component owns the upload
 * and reports the resulting list; where those files end up is the caller's
 * business, which is why the same component serves the product page (attach on
 * add) and the cart (attach to an existing line).
 */

/** Mirrors ALLOWED_FILE_EXTENSIONS on the server. */
export const ACCEPT = ".pdf,.eps,.ai,.stl,.stp,.step,.svg,.dxf"

const MAX_BYTES = 10 * 1024 * 1024

/** Derived, so the sentence under the button cannot outlive the number above it. */
const MAX_LABEL = `${Math.round(MAX_BYTES / (1024 * 1024))} MB`

const apiMessage = (error: unknown) => (error as { data?: { message?: string } })?.data?.message

const formatSize = (bytes: number): string => {
	if (bytes < 1024) return `${bytes} B`
	if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`

	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface Props {
	files: ArtworkFile[]
	onChange: (files: ArtworkFile[]) => void
	maxFiles: number
	required: boolean
	/** Set while the caller is saving, so the list cannot be edited mid-flight. */
	busy?: boolean
	/**
	 * Whether to print the two standing explanations — why a file is needed and
	 * which formats are allowed.
	 *
	 * Only the reason. The accepted formats are printed either way, because
	 * that is the one thing a customer needs in front of them at the moment
	 * they pick a file, and hunting for it elsewhere on the page is worse than
	 * reading it twice.
	 *
	 * The reason is what gets repetitive: it says the same thing about every
	 * made-to-order line, and six of them in a totals panel is a wall.
	 */
	explain?: boolean
	className?: string
}

const ArtworkUpload = ({ files, onChange, maxFiles, required, busy, explain = true, className }: Props) => {
	const t = useTranslations("artwork")
	const { isLoggedIn, isResolved } = useUserInfo()
	const [upload, { isLoading: uploading }] = useUploadArtworkMutation()
	const [error, setError] = useState<string | null>(null)
	const inputRef = useRef<HTMLInputElement>(null)
	// Unique per instance. The order summary shows one of these under every line
	// that needs a drawing, and a fixed id would repeat down the page.
	const inputId = useId()

	const remaining = maxFiles - files.length
	const disabled = busy || uploading || remaining <= 0

	const handleFiles = async (chosen: FileList | null) => {
		if (!chosen?.length) return
		setError(null)

		// Only as many as the line can still take. Choosing ten for three slots
		// should fill the three rather than fail outright.
		const batch = Array.from(chosen).slice(0, remaining)
		const accepted: ArtworkFile[] = []

		for (const file of batch) {
			if (file.size > MAX_BYTES) {
				setError(t("tooLarge", { name: file.name, limit: formatSize(MAX_BYTES) }))
				continue
			}

			try {
				const asset = await upload({ file }).unwrap()
				accepted.push({
					id: asset.id,
					name: asset.originalName ?? file.name,
					sizeBytes: file.size,
					uploadedAt: new Date().toISOString(),
				})
			} catch (cause) {
				setError(apiMessage(cause) ?? t("uploadFailed", { name: file.name }))
			}
		}

		// Reported once, not per file: the caller usually saves on change, and a
		// call per upload would write the line three times for three files.
		if (accepted.length) onChange([...files, ...accepted])

		// Cleared so choosing the same file twice still fires a change event.
		if (inputRef.current) inputRef.current.value = ""
	}

	// Resolving, so neither state is painted yet — showing the sign-in notice
	// here would flash it at customers who are already signed in.
	if (!isResolved) return null

	if (!isLoggedIn) {
		return (
			<p className={cn("text-muted-foreground rounded-md border border-dashed p-4 text-sm", className)}>
				{t("signInRequired")}
			</p>
		)
	}

	return (
		<div className={cn("space-y-3", className)}>
			<div className="flex flex-wrap items-center gap-2">
				<input
					ref={inputRef}
					type="file"
					accept={ACCEPT}
					multiple={maxFiles > 1}
					className="sr-only"
					onChange={(event) => void handleFiles(event.target.files)}
					disabled={disabled}
					id={inputId}
				/>

				<Button
					type="button"
					variant="outline"
					size="sm"
					disabled={disabled}
					onClick={() => inputRef.current?.click()}
				>
					{uploading ? (
						<Loader2 className="mr-2 size-4 animate-spin" />
					) : (
						<Paperclip className="mr-2 size-4" />
					)}
					{t("choose")}
				</Button>

				<span className="text-muted-foreground text-xs">
					{remaining > 0 ? t("remaining", { count: remaining }) : t("full", { max: maxFiles })}
				</span>
			</div>

			{files.length > 0 && (
				<ul className="space-y-2">
					{files.map((file) => (
						<li
							key={file.id}
							className="bg-muted/40 flex items-center gap-2 rounded-md px-3 py-2 text-sm"
						>
							<FileText className="text-muted-foreground size-4 shrink-0" />
							{/* min-w-0 so a long filename truncates instead of pushing the
							    remove button off the row. */}
							<span className="min-w-0 flex-1 truncate" title={file.name}>
								{file.name}
							</span>
							<span className="text-muted-foreground shrink-0 text-xs tabular-nums">
								{formatSize(file.sizeBytes)}
							</span>
							<button
								type="button"
								disabled={busy}
								onClick={() => onChange(files.filter((f) => f.id !== file.id))}
								className="text-muted-foreground hover:text-destructive shrink-0 disabled:opacity-50"
								aria-label={t("remove", { name: file.name })}
							>
								<X className="size-4" />
							</button>
						</li>
					))}
				</ul>
			)}

			{/* Said before the customer is refused at checkout, not after. */}
			{explain && required && files.length === 0 && (
				<p className="text-muted-foreground text-xs">{t("requiredHint")}</p>
			)}

			<p className="text-muted-foreground text-xs">
				{t("accepted", { types: ACCEPT, size: MAX_LABEL })}
			</p>

			{error && <p className="text-destructive text-sm">{error}</p>}
		</div>
	)
}

export default ArtworkUpload
