"use client"

import { useCallback, useState } from "react"
import { useDropzone, type FileRejection } from "react-dropzone"
import { CloudUpload, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useUploadImageMutation } from "@/redux/api/mediaApi"
import { cn } from "@/lib/utils"
import { UNFILED } from "@/types/media"

/** Mirrors the API's allow-list; anything else is rejected before a request. */
const ACCEPTED = {
	"image/jpeg": [".jpg", ".jpeg"],
	"image/png": [".png"],
	"image/webp": [".webp"],
	"image/avif": [".avif"],
	"image/gif": [".gif"],
}

const MAX_IMAGE_BYTES = 10 * 1024 * 1024

export const UploadDropzone = ({
	folderId,
	folderName,
}: {
	/** The folder currently open. UNFILED and "All media" both upload unfiled. */
	folderId: string | undefined
	folderName: string
}) => {
	const [uploadImage] = useUploadImageMutation()
	const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)

	const targetFolder = folderId && folderId !== UNFILED ? folderId : null

	const onDrop = useCallback(
		async (accepted: File[], rejected: readonly FileRejection[]) => {
			for (const { file, errors } of rejected) {
				toast.error(`${file.name} — ${errors[0]?.message ?? "rejected"}`)
			}
			if (!accepted.length) return

			setProgress({ done: 0, total: accepted.length })
			let failed = 0

			// Sequential rather than parallel: each upload runs sharp and writes
			// four derivatives, so a dozen at once would just queue on the server
			// while making the progress count meaningless.
			for (const [index, file] of accepted.entries()) {
				try {
					await uploadImage({ file, folderId: targetFolder }).unwrap()
				} catch (error) {
					failed++
					const message = (error as { data?: { message?: string } })?.data?.message
					toast.error(`${file.name} — ${message ?? "upload failed"}`)
				}
				setProgress({ done: index + 1, total: accepted.length })
			}

			setProgress(null)
			const ok = accepted.length - failed
			if (ok > 0) {
				toast.success(
					`${ok} ${ok === 1 ? "image" : "images"} uploaded${
						targetFolder ? ` to ${folderName}` : ""
					}.`
				)
			}
		},
		[uploadImage, targetFolder, folderName]
	)

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		accept: ACCEPTED,
		maxSize: MAX_IMAGE_BYTES,
		disabled: !!progress,
	})

	return (
		<div
			{...getRootProps()}
			className={cn(
				"flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-6 py-8 text-center transition-colors",
				isDragActive ? "border-primary bg-accent-soft" : "hover:border-primary/50",
				progress && "pointer-events-none opacity-70"
			)}
		>
			<input {...getInputProps()} />

			{progress ? (
				<>
					<Loader2 className="text-primary size-6 animate-spin" />
					<p className="text-sm font-medium">
						Uploading {progress.done} of {progress.total}…
					</p>
				</>
			) : (
				<>
					<CloudUpload className="text-muted-foreground size-6" />
					<p className="text-sm font-medium">
						{isDragActive ? "Drop to upload" : "Drag images here, or click to choose"}
					</p>
					<p className="text-muted-foreground text-xs">
						JPEG, PNG, WebP, AVIF or GIF · up to 10 MB · converted to WebP automatically
						{targetFolder ? ` · filed under ${folderName}` : " · unfiled"}
					</p>
				</>
			)}
		</div>
	)
}

export default UploadDropzone
