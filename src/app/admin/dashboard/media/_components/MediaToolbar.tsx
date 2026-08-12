"use client"

import { useTranslations } from "next-intl"
import { useState } from "react"
import { DropdownMenu } from "radix-ui"
import { FolderInput, Trash2, Upload, X } from "lucide-react"
import { toast } from "sonner"
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import Toolbar from "@/components/dashboard/shell/Toolbar"
import { useDeleteMediaMutation, useUpdateMediaMutation } from "@/redux/api/mediaApi"
import type { MediaAsset, MediaFolder } from "@/types/media"

export const MediaToolbar = ({
	search,
	onSearchChange,
	selected,
	onClearSelection,
	assets,
	folders,
	uploadOpen,
	onToggleUpload,
}: {
	search: string
	onSearchChange: (value: string) => void
	selected: Set<string>
	onClearSelection: () => void
	assets: MediaAsset[]
	folders: MediaFolder[]
	uploadOpen: boolean
	onToggleUpload: () => void
}) => {
	const t = useTranslations("admin")
	const [updateMedia] = useUpdateMediaMutation()
	const [deleteMedia] = useDeleteMediaMutation()
	const [confirmingDelete, setConfirmingDelete] = useState(false)
	const [isBusy, setIsBusy] = useState(false)

	const nameOf = (id: string) => assets.find((a) => a.id === id)?.originalName ?? id

	const move = async (folderId: string | null) => {
		setIsBusy(true)
		let moved = 0
		let failed = 0

		for (const id of selected) {
			try {
				await updateMedia({ id, data: { folderId } }).unwrap()
				moved++
			} catch {
				failed++
			}
		}

		setIsBusy(false)
		onClearSelection()

		const target = folderId ? (folders.find((f) => f.id === folderId)?.name ?? t("folderWord")) : t("unfiled")
		if (moved) toast.success(t("movedToFolder", { count: moved, folder: target }))
		if (failed) toast.error(t("couldNotBeMoved", { count: failed }))
	}

	const removeSelected = async () => {
		setIsBusy(true)
		let deleted = 0
		const failures: { name: string; message: string }[] = []

		for (const id of selected) {
			try {
				await deleteMedia(id).unwrap()
				deleted++
			} catch (error) {
				failures.push({
					name: nameOf(id),
					message:
						(error as { data?: { message?: string } })?.data?.message ??
						t("couldNotBeDeleted"),
				})
			}
		}

		setIsBusy(false)
		setConfirmingDelete(false)
		onClearSelection()

		if (deleted) toast.success(t("deletedFiles", { count: deleted }))
		// The API refuses a file still attached to a product, and says which.
		if (failures.length) toast.error(`“${failures[0].name}” — ${failures[0].message}`)
	}

	return (
		<>
			<Toolbar
				searchValue={search}
				onSearchChange={onSearchChange}
				searchPlaceholder={t("searchByFileName")}
				selectedCount={selected.size}
				onClearSelection={onClearSelection}
				selectionActions={
					<>
						<DropdownMenu.Root>
							<DropdownMenu.Trigger asChild>
								<Button variant="outline" size="lg" disabled={isBusy}>
									<FolderInput />{t("moveTo")}</Button>
							</DropdownMenu.Trigger>
							<DropdownMenu.Portal>
								<DropdownMenu.Content
									align="end"
									sideOffset={6}
									className="bg-card border-border z-50 max-h-72 min-w-48 overflow-y-auto rounded-lg border p-1 shadow-lg"
								>
									<DropdownMenu.Item
										onSelect={() => move(null)}
										className="hover:bg-muted rounded-md px-2.5 py-2 text-sm outline-none"
									>{t("unfiled")}</DropdownMenu.Item>
									{folders.length > 0 && (
										<DropdownMenu.Separator className="bg-border my-1 h-px" />
									)}
									{folders.map((folder) => (
										<DropdownMenu.Item
											key={folder.id}
											onSelect={() => move(folder.id)}
											className="hover:bg-muted rounded-md px-2.5 py-2 text-sm outline-none"
										>
											{folder.name}
										</DropdownMenu.Item>
									))}
								</DropdownMenu.Content>
							</DropdownMenu.Portal>
						</DropdownMenu.Root>

						<Button
							variant="destructive"
							size="lg"
							disabled={isBusy}
							onClick={() => setConfirmingDelete(true)}
						>
							<Trash2 />{t("delete")}</Button>
					</>
				}
				primaryAction={
					<Button
						size="lg"
						variant={uploadOpen ? "outline" : "default"}
						onClick={onToggleUpload}
						aria-expanded={uploadOpen}
						aria-controls="media-upload-panel"
					>
						{uploadOpen ? <X /> : <Upload />}
						{uploadOpen ? t("close") : t("upload")}
					</Button>
				}
			/>

			<AlertDialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							{t("deleteFilesTitle", { count: selected.size })}
						</AlertDialogTitle>
						<AlertDialogDescription>
							This also removes every generated size. A file still attached to a
							product cannot be deleted — those will be skipped.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isBusy}>{t("cancel")}</AlertDialogCancel>
						<AlertDialogAction
							onClick={(event) => {
								event.preventDefault()
								removeSelected()
							}}
							disabled={isBusy}
						>
							{isBusy ? t("deleting") : "Delete"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	)
}

export default MediaToolbar
