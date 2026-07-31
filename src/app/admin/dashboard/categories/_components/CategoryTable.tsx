"use client"

import { useMemo, useState } from "react"
import { CornerDownRight, ExternalLink, Pencil, Plus, Trash2 } from "lucide-react"
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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import Toolbar from "@/components/dashboard/shell/Toolbar"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table"
import { useDeleteCategoryMutation } from "@/redux/api/categoryApi"
import { cn } from "@/lib/utils"
import type { AdminCategory, CategoryNode } from "@/types/catalog"
import {
	buildTree,
	displayName,
	flattenTree,
	storefrontCategoryUrl,
	translationFor,
} from "./categoryTree"

export const CategoryTable = ({
	categories,
	onEdit,
	onCreate,
}: {
	categories: AdminCategory[]
	onEdit: (category: AdminCategory) => void
	onCreate: () => void
}) => {
	const [deleteCategory] = useDeleteCategoryMutation()
	const [selected, setSelected] = useState<Set<string>>(new Set())
	const [pending, setPending] = useState<CategoryNode[] | null>(null)
	const [isDeleting, setIsDeleting] = useState(false)
	const [query, setQuery] = useState("")

	const tree = useMemo(() => flattenTree(buildTree(categories)), [categories])

	/**
	 * Searching flattens the tree.
	 *
	 * Indentation means "child of the row above", which stops being true the
	 * moment rows are filtered out — a match whose parent was filtered away
	 * would appear indented under an unrelated row.
	 */
	const isSearching = query.trim().length > 0
	const rows = useMemo(() => {
		if (!isSearching) return tree
		const needle = query.trim().toLowerCase()
		return tree.filter((row) =>
			[displayName(row), translationFor(row, "en")?.slug ?? ""].some((value) =>
				value.toLowerCase().includes(needle)
			)
		)
	}, [tree, query, isSearching])

	const toggle = (id: string) =>
		setSelected((current) => {
			const next = new Set(current)
			if (next.has(id)) next.delete(id)
			else next.add(id)
			return next
		})

	const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id))
	const someSelected = selected.size > 0 && !allSelected

	/**
	 * Children whose parent is selected but which are not. The API refuses to
	 * delete a category that still has sub-categories, so these are what will
	 * make the run fail — worth naming before it happens.
	 */
	const blockingChildren = pending
		? tree.filter(
				(row) =>
					row.parentId &&
					pending.some((p) => p.id === row.parentId) &&
					!pending.some((p) => p.id === row.id)
			)
		: []

	const runDelete = async () => {
		if (!pending?.length) return
		setIsDeleting(true)

		/**
		 * Deepest first, one at a time. A parent cannot be deleted while it still
		 * has children, so a whole branch only goes bottom-up — and running these
		 * in parallel would race and fail the parent before its children were gone.
		 */
		const ordered = [...pending].sort((a, b) => b.depth - a.depth)

		const failures: { name: string; message: string }[] = []
		let deleted = 0

		for (const row of ordered) {
			try {
				await deleteCategory(row.id).unwrap()
				deleted++
			} catch (error) {
				failures.push({
					name: displayName(row),
					message:
						(error as { data?: { message?: string } })?.data?.message ??
						"Could not be deleted.",
				})
			}
		}

		setIsDeleting(false)
		setPending(null)
		setSelected(new Set())

		if (deleted) {
			toast.success(`${deleted} ${deleted === 1 ? "category" : "categories"} deleted.`)
		}
		if (failures.length) {
			toast.error(
				failures.length === 1
					? `“${failures[0].name}” — ${failures[0].message}`
					: `${failures.length} could not be deleted. “${failures[0].name}” — ${failures[0].message}`
			)
		}
	}

	return (
		<>
			<Toolbar
				searchValue={query}
				onSearchChange={setQuery}
				searchPlaceholder="Search categories…"
				selectedCount={selected.size}
				onClearSelection={() => setSelected(new Set())}
				selectionActions={
					<Button
						variant="destructive"
						size="lg"
						onClick={() => setPending(tree.filter((row) => selected.has(row.id)))}
					>
						<Trash2 />
						Delete
					</Button>
				}
				primaryAction={
					<Button size="lg" onClick={onCreate}>
						<Plus />
						New category
					</Button>
				}
			/>

			<div className="bg-card overflow-hidden rounded-lg border">
				<div className="overflow-x-auto">
					<Table>
						<TableHeader className="bg-muted/50">
							<TableRow className="hover:bg-transparent">
								<TableHead className="w-12 pl-4">
									<Checkbox
										checked={
											allSelected ? true : someSelected ? "indeterminate" : false
										}
										onCheckedChange={(checked) =>
											setSelected(
												checked ? new Set(rows.map((r) => r.id)) : new Set()
											)
										}
										aria-label="Select all categories"
										disabled={!rows.length}
									/>
								</TableHead>
								<TableHead className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
									Category
								</TableHead>
								<TableHead className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
									Slug
								</TableHead>
								<TableHead className="text-muted-foreground text-right text-xs font-medium tracking-wide uppercase">
									Products
								</TableHead>
								<TableHead className="w-24 pr-4" />
							</TableRow>
						</TableHeader>

						<TableBody>
							{!rows.length && (
								<TableRow className="hover:bg-transparent">
									<TableCell colSpan={5} className="h-40 text-center">
										<p className="text-muted-foreground text-sm">
											{isSearching
												? `Nothing matches “${query}”.`
												: "No categories yet. Create the first one to start building the catalogue."}
										</p>
									</TableCell>
								</TableRow>
							)}

							{rows.map((row) => {
								const en = translationFor(row, "en")
								const isSelected = selected.has(row.id)

								return (
									<TableRow
										key={row.id}
										data-state={isSelected ? "selected" : undefined}
										className={cn(isSelected && "bg-accent-soft hover:bg-accent-soft")}
									>
										<TableCell className="pl-4">
											<Checkbox
												checked={isSelected}
												onCheckedChange={() => toggle(row.id)}
												aria-label={`Select ${displayName(row)}`}
											/>
										</TableCell>

										<TableCell>
											<div
												className="flex items-center gap-2"
												// Indentation only means anything in tree mode.
												style={{
													paddingLeft: isSearching ? 0 : `${row.depth * 22}px`,
												}}
											>
												{!isSearching && row.depth > 0 && (
													<CornerDownRight className="text-muted-foreground/60 size-3.5 shrink-0" />
												)}

												{en?.slug ? (
													<a
														href={storefrontCategoryUrl(en.slug)}
														target="_blank"
														rel="noopener noreferrer"
														className="group inline-flex items-center gap-1.5 font-medium hover:underline"
													>
														{displayName(row)}
														<ExternalLink className="text-muted-foreground size-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
													</a>
												) : (
													<span className="font-medium">{displayName(row)}</span>
												)}

												{row.isHidden && (
													<Badge variant="secondary" className="font-normal">
														Hidden
													</Badge>
												)}
												{row.isOptionCategory && (
													<Badge variant="outline" className="font-normal">
														Option
													</Badge>
												)}
											</div>
										</TableCell>

										<TableCell className="text-muted-foreground font-mono text-xs">
											{en?.slug ?? "—"}
										</TableCell>

										<TableCell className="text-right tabular-nums">
											{row.productCount > 0 ? (
												row.productCount
											) : (
												<span className="text-muted-foreground">—</span>
											)}
										</TableCell>

										<TableCell className="pr-4">
											<div className="flex justify-end gap-1">
												<Button
													variant="ghost"
													size="icon"
													aria-label={`Edit ${displayName(row)}`}
													onClick={() => onEdit(row)}
												>
													<Pencil />
												</Button>
												<Button
													variant="ghost"
													size="icon"
													className="text-muted-foreground hover:text-destructive"
													aria-label={`Delete ${displayName(row)}`}
													onClick={() => setPending([row])}
												>
													<Trash2 />
												</Button>
											</div>
										</TableCell>
									</TableRow>
								)
							})}
						</TableBody>
					</Table>
				</div>

				{rows.length > 0 && (
					<div className="text-muted-foreground border-t px-4 py-2.5 text-xs">
						{rows.length} {rows.length === 1 ? "category" : "categories"}
						{isSearching && ` matching “${query}”`}
						{selected.size > 0 && ` · ${selected.size} selected`}
					</div>
				)}
			</div>

			<AlertDialog open={!!pending} onOpenChange={(open) => !open && setPending(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							{pending?.length === 1
								? `Delete “${displayName(pending[0])}”?`
								: `Delete ${pending?.length} categories?`}
						</AlertDialogTitle>
						<AlertDialogDescription asChild>
							<div className="space-y-2">
								<p>
									This removes {pending?.length === 1 ? "it" : "them"} in every
									language and cannot be undone.
								</p>
								{blockingChildren.length > 0 && (
									<p className="text-destructive">
										{blockingChildren.length}{" "}
										{blockingChildren.length === 1
											? "sub-category is"
											: "sub-categories are"}{" "}
										not selected (
										{blockingChildren.map((c) => displayName(c)).join(", ")}). A
										category cannot be deleted while it still has children, so those
										parents will be skipped.
									</p>
								)}
							</div>
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={(event) => {
								// Stay open until the run finishes so a partial failure is read
								// in context.
								event.preventDefault()
								runDelete()
							}}
							disabled={isDeleting}
						>
							{isDeleting ? "Deleting…" : "Delete"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	)
}

export default CategoryTable
