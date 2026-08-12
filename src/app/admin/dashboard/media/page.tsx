"use client"

import { useTranslations } from "next-intl"
import { useState } from "react"
import { Loader2 } from "lucide-react"
import Reveal from "@/components/dashboard/shell/Reveal"
import { useMediaFoldersQuery, useMediaQuery } from "@/redux/api/mediaApi"
import { UNFILED } from "@/types/media"
import FolderSidebar from "./_components/FolderSidebar"
import MediaGrid from "./_components/MediaGrid"
import MediaToolbar from "./_components/MediaToolbar"
import UploadDropzone from "./_components/UploadDropzone"

export default function MediaPage() {
	const t = useTranslations("admin")
	/** undefined = All media · UNFILED = unfiled · otherwise a folder id. */
	const [folderId, setFolderId] = useState<string | undefined>(undefined)
	const [search, setSearch] = useState("")
	const [selected, setSelected] = useState<Set<string>>(new Set())
	const [uploadOpen, setUploadOpen] = useState(false)

	const { data: folders = [] } = useMediaFoldersQuery()

	const { data: result, isLoading } = useMediaQuery({
		folderId,
		search: search.trim() || undefined,
		limit: 100,
	})

	// Sidebar counts. Cheap — limit 1, only the total is read.
	const { data: allResult } = useMediaQuery({ limit: 1 })
	const { data: unfiledResult } = useMediaQuery({ folderId: UNFILED, limit: 1 })

	const assets = result?.data ?? []

	const toggle = (id: string) =>
		setSelected((current) => {
			const next = new Set(current)
			if (next.has(id)) next.delete(id)
			else next.add(id)
			return next
		})

	const selectFolder = (next: string | undefined) => {
		setFolderId(next)
		// A selection made in one folder means nothing in another, and acting on
		// it after switching would move files the user can no longer see.
		setSelected(new Set())
	}

	const currentFolderName =
		folderId && folderId !== UNFILED
			? (folders.find((f) => f.id === folderId)?.name ?? "this folder")
			: t("unfiled")

	return (
		<div className="flex gap-5">
			<FolderSidebar
				folders={folders}
				selected={folderId}
				onSelect={selectFolder}
				totalCount={allResult?.meta?.total ?? 0}
				unfiledCount={unfiledResult?.meta?.total ?? 0}
			/>

			{/* No space-y here: the upload panel manages its own spacing so that a
			    closed panel leaves no gap behind. */}
			<div className="min-w-0 flex-1">
				<div className="mb-4">
					<MediaToolbar
						search={search}
						onSearchChange={setSearch}
						selected={selected}
						onClearSelection={() => setSelected(new Set())}
						assets={assets}
						folders={folders}
						uploadOpen={uploadOpen}
						onToggleUpload={() => setUploadOpen((open) => !open)}
					/>
				</div>

				<Reveal open={uploadOpen}>
					<div id="media-upload-panel">
						<UploadDropzone folderId={folderId} folderName={currentFolderName} />
					</div>
				</Reveal>

				{isLoading ? (
					<div className="bg-card text-muted-foreground flex items-center justify-center gap-2 rounded-lg border p-16 text-sm">
						<Loader2 className="size-4 animate-spin" />{t("loadingMedia")}</div>
				) : (
					<MediaGrid assets={assets} selected={selected} onToggle={toggle} />
				)}
			</div>
		</div>
	)
}
