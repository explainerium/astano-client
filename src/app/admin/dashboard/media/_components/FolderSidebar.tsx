"use client"

import { useMemo, useState } from "react"
import { FolderIcon, FolderPlus, Images, Inbox, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
	useCreateMediaFolderMutation,
	useDeleteMediaFolderMutation,
} from "@/redux/api/mediaApi"
import { cn } from "@/lib/utils"
import { UNFILED, type MediaFolder, type MediaFolderNode } from "@/types/media"

/** Flat list → nested, sorted by sortOrder then name. */
const buildFolderTree = (folders: MediaFolder[]): MediaFolderNode[] => {
	const byId = new Map<string, MediaFolderNode>(
		folders.map((f) => [f.id, { ...f, children: [], depth: 0 }])
	)
	const roots: MediaFolderNode[] = []

	for (const node of byId.values()) {
		const parent = node.parentId ? byId.get(node.parentId) : undefined
		if (parent) parent.children.push(node)
		else roots.push(node)
	}

	const sort = (nodes: MediaFolderNode[], depth: number): MediaFolderNode[] => {
		nodes.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
		for (const node of nodes) {
			node.depth = depth
			sort(node.children, depth + 1)
		}
		return nodes
	}

	return sort(roots, 0)
}

const flatten = (nodes: MediaFolderNode[]): MediaFolderNode[] =>
	nodes.flatMap((n) => [n, ...flatten(n.children)])

export const FolderSidebar = ({
	folders,
	selected,
	onSelect,
	totalCount,
	unfiledCount,
}: {
	folders: MediaFolder[]
	/** undefined = All media, UNFILED = unfiled, otherwise a folder id. */
	selected: string | undefined
	onSelect: (folderId: string | undefined) => void
	totalCount: number
	unfiledCount: number
}) => {
	const [createFolder, { isLoading: isCreating }] = useCreateMediaFolderMutation()
	const [deleteFolder] = useDeleteMediaFolderMutation()
	const [newName, setNewName] = useState("")
	const [adding, setAdding] = useState(false)

	const rows = useMemo(() => flatten(buildFolderTree(folders)), [folders])

	const submitFolder = async () => {
		const name = newName.trim()
		if (!name) return
		try {
			await createFolder({ name }).unwrap()
			toast.success(`Folder “${name}” created.`)
			setNewName("")
			setAdding(false)
		} catch (error) {
			const message = (error as { data?: { message?: string } })?.data?.message
			toast.error(message ?? "Could not create the folder.")
		}
	}

	const removeFolder = async (folder: MediaFolder) => {
		try {
			await deleteFolder(folder.id).unwrap()
			toast.success(`Folder “${folder.name}” deleted.`)
			if (selected === folder.id) onSelect(undefined)
		} catch (error) {
			// The API refuses a folder that still holds files, and says so.
			const message = (error as { data?: { message?: string } })?.data?.message
			toast.error(message ?? "Could not delete the folder.")
		}
	}

	const Item = ({
		active,
		icon: Icon,
		label,
		count,
		depth = 0,
		onClick,
		onDelete,
	}: {
		active: boolean
		icon: typeof FolderIcon
		label: string
		count: number
		depth?: number
		onClick: () => void
		onDelete?: () => void
	}) => (
		<div
			className={cn(
				// pr-2 rather than pr-1 so the count and delete icon are not pressed
				// against the panel edge.
				"group flex items-center gap-2 rounded-lg pr-2 text-sm transition-colors",
				active ? "bg-primary text-primary-foreground font-medium" : "hover:bg-muted"
			)}
			style={{ paddingLeft: `${8 + depth * 14}px` }}
		>
			<button type="button" onClick={onClick} className="flex flex-1 items-center gap-2 py-2 text-left">
				<Icon className={cn("size-4 shrink-0", !active && "text-muted-foreground")} />
				<span className="truncate">{label}</span>
				<span className={cn("ml-auto text-xs tabular-nums", !active && "text-muted-foreground")}>
					{count}
				</span>
			</button>

			{onDelete && (
				<button
					type="button"
					aria-label={`Delete folder ${label}`}
					onClick={onDelete}
					className={cn(
						"opacity-0 transition-opacity group-hover:opacity-100",
						active ? "text-primary-foreground" : "text-muted-foreground hover:text-destructive"
					)}
				>
					<Trash2 className="size-3.5" />
				</button>
			)}
		</div>
	)

	return (
		<aside className="bg-card w-56 shrink-0 space-y-1 rounded-lg border p-2">
			<Item
				active={selected === undefined}
				icon={Images}
				label="All media"
				count={totalCount}
				onClick={() => onSelect(undefined)}
			/>
			<Item
				active={selected === UNFILED}
				icon={Inbox}
				label="Unfiled"
				count={unfiledCount}
				onClick={() => onSelect(UNFILED)}
			/>

			{rows.length > 0 && <div className="bg-border my-2 h-px" />}

			{rows.map((folder) => (
				<Item
					key={folder.id}
					active={selected === folder.id}
					icon={FolderIcon}
					label={folder.name}
					count={folder.assetCount}
					depth={folder.depth}
					onClick={() => onSelect(folder.id)}
					onDelete={() => removeFolder(folder)}
				/>
			))}

			<div className="pt-2">
				{adding ? (
					<div className="space-y-2 px-1">
						<Input
							autoFocus
							value={newName}
							onChange={(event) => setNewName(event.target.value)}
							onKeyDown={(event) => {
								if (event.key === "Enter") submitFolder()
								if (event.key === "Escape") {
									setAdding(false)
									setNewName("")
								}
							}}
							placeholder="Folder name"
							className="h-8 text-sm"
						/>
						<div className="flex gap-1">
							<Button size="sm" onClick={submitFolder} disabled={isCreating}>
								Create
							</Button>
							<Button
								size="sm"
								variant="ghost"
								onClick={() => {
									setAdding(false)
									setNewName("")
								}}
							>
								Cancel
							</Button>
						</div>
					</div>
				) : (
					<Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => setAdding(true)}>
						<FolderPlus />
						New folder
					</Button>
				)}
			</div>
		</aside>
	)
}

export default FolderSidebar
