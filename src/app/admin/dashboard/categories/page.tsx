"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { useAdminCategoriesQuery } from "@/redux/api/categoryApi"
import type { AdminCategory } from "@/types/catalog"
import CategoryFormDialog from "./_components/CategoryFormDialog"
import CategoryTable from "./_components/CategoryTable"

export default function CategoriesPage() {
	const { data: categories, isLoading, isError, error } = useAdminCategoriesQuery()

	const [dialogOpen, setDialogOpen] = useState(false)
	const [editing, setEditing] = useState<AdminCategory | undefined>()

	const openCreate = () => {
		setEditing(undefined)
		setDialogOpen(true)
	}

	const openEdit = (category: AdminCategory) => {
		setEditing(category)
		setDialogOpen(true)
	}

	return (
		<div className="space-y-4">
			{isLoading && (
				<div className="bg-card text-muted-foreground flex items-center justify-center gap-2 rounded-lg border p-16 text-sm">
					<Loader2 className="size-4 animate-spin" />
					Loading categories…
				</div>
			)}

			{isError && (
				<div className="text-destructive bg-card rounded-lg border border-dashed p-16 text-center text-sm">
					{(error as { data?: { message?: string } })?.data?.message ??
						"Could not load categories."}
				</div>
			)}

			{categories && (
				<CategoryTable
					categories={categories}
					onEdit={openEdit}
					onCreate={openCreate}
				/>
			)}

			{/* Mounted only while open so the form rebuilds per category — useForm
			    reads defaultValues once. */}
			{dialogOpen && (
				<CategoryFormDialog
					open={dialogOpen}
					onOpenChange={setDialogOpen}
					category={editing}
					allCategories={categories ?? []}
				/>
			)}
		</div>
	)
}
