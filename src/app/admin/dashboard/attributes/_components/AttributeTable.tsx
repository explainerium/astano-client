"use client"

import { useMemo, useState } from "react"
import { Pencil, Plus, Trash2 } from "lucide-react"
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
import { useDeleteAttributeMutation } from "@/redux/api/attributeApi"
import { cn } from "@/lib/utils"
import type { AdminAttribute } from "@/types/attribute"

const nameOf = (attribute: AdminAttribute): string =>
	attribute.translations.find((t) => t.locale === "en")?.name ??
	attribute.translations[0]?.name ??
	attribute.code

export const AttributeTable = ({
	attributes,
	onEdit,
	onCreate,
}: {
	attributes: AdminAttribute[]
	onEdit: (attribute: AdminAttribute) => void
	onCreate: () => void
}) => {
	const [deleteAttribute] = useDeleteAttributeMutation()
	const [selected, setSelected] = useState<Set<string>>(new Set())
	const [pending, setPending] = useState<AdminAttribute[] | null>(null)
	const [isDeleting, setIsDeleting] = useState(false)
	const [query, setQuery] = useState("")

	const rows = useMemo(() => {
		const needle = query.trim().toLowerCase()
		if (!needle) return attributes
		return attributes.filter((attribute) =>
			[nameOf(attribute), attribute.code, ...attribute.values.map((v) => v.code)].some((value) =>
				value.toLowerCase().includes(needle)
			)
		)
	}, [attributes, query])

	const toggle = (id: string) =>
		setSelected((current) => {
			const next = new Set(current)
			if (next.has(id)) next.delete(id)
			else next.add(id)
			return next
		})

	const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id))
	const someSelected = selected.size > 0 && !allSelected

	const runDelete = async () => {
		if (!pending?.length) return
		setIsDeleting(true)

		let deleted = 0
		const failures: { name: string; message: string }[] = []

		for (const attribute of pending) {
			try {
				await deleteAttribute(attribute.id).unwrap()
				deleted++
			} catch (error) {
				failures.push({
					name: nameOf(attribute),
					message:
						(error as { data?: { message?: string } })?.data?.message ??
						"Could not be deleted.",
				})
			}
		}

		setIsDeleting(false)
		setPending(null)
		setSelected(new Set())

		if (deleted) toast.success(`${deleted} ${deleted === 1 ? "attribute" : "attributes"} deleted.`)
		// The API refuses an attribute a product still uses, and says so.
		if (failures.length) toast.error(`“${failures[0].name}” — ${failures[0].message}`)
	}

	return (
		<>
			<Toolbar
				searchValue={query}
				onSearchChange={setQuery}
				searchPlaceholder="Search attributes…"
				selectedCount={selected.size}
				onClearSelection={() => setSelected(new Set())}
				selectionActions={
					<Button
						variant="destructive"
						size="lg"
						onClick={() => setPending(rows.filter((r) => selected.has(r.id)))}
					>
						<Trash2 />
						Delete
					</Button>
				}
				primaryAction={
					<Button size="lg" onClick={onCreate}>
						<Plus />
						New attribute
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
										checked={allSelected ? true : someSelected ? "indeterminate" : false}
										onCheckedChange={(checked) =>
											setSelected(checked ? new Set(rows.map((r) => r.id)) : new Set())
										}
										aria-label="Select all attributes"
										disabled={!rows.length}
									/>
								</TableHead>
								<TableHead className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
									Attribute
								</TableHead>
								<TableHead className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
									Code
								</TableHead>
								<TableHead className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
									Values
								</TableHead>
								<TableHead className="w-16 pr-4" />
							</TableRow>
						</TableHeader>

						<TableBody>
							{!rows.length && (
								<TableRow className="hover:bg-transparent">
									<TableCell colSpan={5} className="h-40 text-center">
										<p className="text-muted-foreground text-sm">
											{query.trim()
												? `Nothing matches “${query}”.`
												: "No attributes yet. Add Size or Colour to start building variants."}
										</p>
									</TableCell>
								</TableRow>
							)}

							{rows.map((attribute) => {
								const isSelected = selected.has(attribute.id)
								const de = attribute.translations.find((t) => t.locale === "de")

								return (
									<TableRow
										key={attribute.id}
										data-state={isSelected ? "selected" : undefined}
										className={cn(isSelected && "bg-accent-soft hover:bg-accent-soft")}
									>
										<TableCell className="pl-4">
											<Checkbox
												checked={isSelected}
												onCheckedChange={() => toggle(attribute.id)}
												aria-label={`Select ${nameOf(attribute)}`}
											/>
										</TableCell>

										<TableCell>
											<div className="flex items-center gap-2">
												<span className="font-medium">{nameOf(attribute)}</span>
												{!de && (
													<span className="text-destructive/70 text-xs">
														not translated
													</span>
												)}
											</div>
										</TableCell>

										<TableCell className="text-muted-foreground font-mono text-xs">
											{attribute.code}
										</TableCell>

										<TableCell>
											{attribute.values.length ? (
												<div className="flex flex-wrap gap-1">
													{attribute.values.slice(0, 6).map((value) => (
														<Badge
															key={value.id}
															variant="secondary"
															className="font-normal"
														>
															{value.translations.find((t) => t.locale === "en")
																?.label ?? value.code}
														</Badge>
													))}
													{attribute.values.length > 6 && (
														<span className="text-muted-foreground self-center text-xs">
															+{attribute.values.length - 6}
														</span>
													)}
												</div>
											) : (
												<span className="text-muted-foreground text-xs">none</span>
											)}
										</TableCell>

										<TableCell className="pr-4">
											<div className="flex justify-end">
												<Button
													variant="ghost"
													size="icon"
													aria-label={`Edit ${nameOf(attribute)}`}
													onClick={() => onEdit(attribute)}
												>
													<Pencil />
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
						{rows.length} {rows.length === 1 ? "attribute" : "attributes"}
						{selected.size > 0 && ` · ${selected.size} selected`}
					</div>
				)}
			</div>

			<AlertDialog open={!!pending} onOpenChange={(open) => !open && setPending(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							{pending?.length === 1
								? `Delete “${nameOf(pending[0])}”?`
								: `Delete ${pending?.length} attributes?`}
						</AlertDialogTitle>
						<AlertDialogDescription>
							This removes the attribute and all of its values, in every language.
							An attribute a product still uses cannot be deleted — those will be
							skipped.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={(event) => {
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

export default AttributeTable
