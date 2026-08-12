"use client"

import { useTranslations } from "next-intl"
import { useState } from "react"
import { CloudUpload, Loader2 } from "lucide-react"
import Reveal from "@/components/dashboard/shell/Reveal"
import { Button } from "@/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useMediaFoldersQuery, useMediaQuery } from "@/redux/api/mediaApi"
import { UNFILED, type MediaAsset } from "@/types/media"
import FolderSidebar from "../../media/_components/FolderSidebar"
import MediaGrid from "../../media/_components/MediaGrid"
import UploadDropzone from "../../media/_components/UploadDropzone"

const Picker = ({
	multiple,
	confirmLabel,
	onConfirm,
	onClose,
}: {
	multiple: boolean
	confirmLabel?: string
	onConfirm: (assets: MediaAsset[]) => void
	onClose: () => void
}) => {
	const t = useTranslations("admin")
	// Not a parameter default — that is evaluated before any hook has run.
	const confirmText = confirmLabel ?? t("useSelected")
	/** undefined = All media · UNFILED = unfiled · otherwise a folder id. */
	const [folderId, setFolderId] = useState<string | undefined>(undefined)
	const [search, setSearch] = useState("")
	const [uploadOpen, setUploadOpen] = useState(false)

	/**
	 * Keyed by id, holding the whole asset.
	 *
	 * A pick has to survive changing the folder or the search — once the query
	 * moves on the asset is no longer in `assets`, but the caller still needs
	 * its URL to draw a thumbnail without fetching it again. It is also why the
	 * selection is deliberately *not* cleared when the folder changes, unlike
	 * the library page: building a gallery from two folders is a normal thing
	 * to want, whereas a bulk delete spanning folders is not.
	 */
	const [chosen, setChosen] = useState<Map<string, MediaAsset>>(new Map())

	const { data: folders = [] } = useMediaFoldersQuery()

	// Private files are customer design uploads: no public URL, so one can never
	// be a product image. Filtering here beats letting it be picked and drawing
	// a broken tile on the product page.
	const { data: result, isLoading } = useMediaQuery({
		folderId,
		search: search.trim() || undefined,
		visibility: "PUBLIC",
		limit: 100,
	})

	// Sidebar counts. Cheap — limit 1, only the total is read.
	const { data: allResult } = useMediaQuery({ visibility: "PUBLIC", limit: 1 })
	const { data: unfiledResult } = useMediaQuery({
		folderId: UNFILED,
		visibility: "PUBLIC",
		limit: 1,
	})

	const assets = result?.data ?? []

	const folderName =
		folderId && folderId !== UNFILED
			? (folders.find((f) => f.id === folderId)?.name ?? "this folder")
			: t("unfiled")

	/** Single mode keeps one; multiple mode toggles within the set. */
	const select = (asset: MediaAsset) =>
		setChosen((current) => {
			const next = multiple ? new Map(current) : new Map<string, MediaAsset>()
			if (current.has(asset.id)) next.delete(asset.id)
			else next.set(asset.id, asset)
			return next
		})

	const toggle = (id: string) => {
		const asset = assets.find((a) => a.id === id)
		if (asset) select(asset)
	}

	const confirm = () => {
		onConfirm([...chosen.values()])
		onClose()
	}

	return (
		<>
			<div className="flex flex-wrap items-center gap-2">
				<Input
					value={search}
					onChange={(event) => setSearch(event.target.value)}
					placeholder={t("searchByFileName")}
					className="max-w-xs"
				/>
				<Button
					type="button"
					variant={uploadOpen ? "secondary" : "outline"}
					className="ml-auto"
					aria-expanded={uploadOpen}
					onClick={() => setUploadOpen((open) => !open)}
				>
					<CloudUpload />{t("uploadFiles")}</Button>
			</div>

			<Reveal open={uploadOpen}>
				<UploadDropzone
					folderId={folderId}
					folderName={folderName}
					// Selected the moment it lands, so an upload is one step rather
					// than upload-then-hunt-for-it-in-the-grid.
					onUploaded={select}
				/>
			</Reveal>

			<div className="flex min-h-0 flex-1 gap-4">
				<div className="overflow-y-auto">
					<FolderSidebar
						folders={folders}
						selected={folderId}
						onSelect={setFolderId}
						totalCount={allResult?.meta?.total ?? 0}
						unfiledCount={unfiledResult?.meta?.total ?? 0}
					/>
				</div>

				<div className="min-w-0 flex-1 overflow-y-auto">
					{isLoading ? (
						<div className="text-muted-foreground flex items-center justify-center gap-2 p-16 text-sm">
							<Loader2 className="size-4 animate-spin" />{t("loadingMedia")}</div>
					) : (
						<MediaGrid assets={assets} selected={new Set(chosen.keys())} onToggle={toggle} />
					)}
				</div>
			</div>

			<DialogFooter className="sm:justify-between">
				<span className="text-muted-foreground self-center text-xs">
					{chosen.size ? `${chosen.size} selected` : t("nothingSelected")}
				</span>
				<div className="flex gap-2">
					<Button type="button" variant="ghost" onClick={onClose}>{t("cancel")}</Button>
					<Button type="button" disabled={!chosen.size} onClick={confirm}>
						{confirmText}
					</Button>
				</div>
			</DialogFooter>
		</>
	)
}

/**
 * Picks images out of the media library without leaving the product.
 *
 * Composed from the library page's own folder sidebar, grid and dropzone rather
 * than reimplementing them, so uploading, filing and creating folders behave
 * identically in both places and cannot drift apart.
 *
 * The body is a separate component rendered inside the dialog, so it unmounts
 * on close and search, folder and selection reset themselves — no effect to
 * keep in sync, and no stale selection waiting the next time it opens.
 */
export const AssetPickerDialog = ({
	open,
	onOpenChange,
	multiple = false,
	title,
	description,
	confirmLabel,
	onConfirm,
}: {
	open: boolean
	onOpenChange: (open: boolean) => void
	multiple?: boolean
	title: string
	description?: string
	confirmLabel?: string
	onConfirm: (assets: MediaAsset[]) => void
}) => (
	<Dialog open={open} onOpenChange={onOpenChange}>
		{/*
		 * Near-full-screen, like WordPress's media modal. A fixed height rather
		 * than a max-height so the sidebar and grid scroll inside their own
		 * panes and the toolbar and footer stay put — a modal that resizes as
		 * you page through folders is disorienting to click in.
		 */}
		<DialogContent className="flex h-[85vh] flex-col gap-4 sm:max-w-6xl">
			<DialogHeader>
				<DialogTitle>{title}</DialogTitle>
				{description && <DialogDescription>{description}</DialogDescription>}
			</DialogHeader>

			<Picker
				multiple={multiple}
				confirmLabel={confirmLabel}
				onConfirm={onConfirm}
				onClose={() => onOpenChange(false)}
			/>
		</DialogContent>
	</Dialog>
)

export default AssetPickerDialog
