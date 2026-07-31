"use client"

import { useState } from "react"
import Link from "next/link"
import { ExternalLink, Pencil, Plus, Trash2 } from "lucide-react"
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
import { Checkbox } from "@/components/ui/checkbox"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table"
import Toolbar from "@/components/dashboard/shell/Toolbar"
import StatusLinks, { type StatusCounts } from "./StatusLinks"
import { getPathname } from "@/i18n/navigation"
import { useDeleteProductMutation } from "@/redux/api/productApi"
import { cn } from "@/lib/utils"
import type {
	AdminProduct,
	ProductKind,
	ProductStatus,
	ProductVisibility,
	StockStatus,
} from "@/types/product"

const ANY = "__any__"

const money = new Intl.NumberFormat("en-GB", { style: "currency", currency: "EUR" })

/**
 * The price a normal retail customer sees.
 *
 * Variant prices win as a complete set over product prices — never mixed row by
 * row — so the variant is checked first (§1C). This column is indicative only;
 * the real figure depends on role and quantity and is resolved server-side by
 * resolvePrice().
 */
const displayPrice = (product: AdminProduct): string | null => {
	const variant = product.variants.find((v) => v.isDefault) ?? product.variants[0]
	const row =
		variant?.prices.find((p) => p.role === "B2C") ??
		product.prices.find((p) => p.role === "B2C")

	return row ? money.format(Number(row.basePrice)) : null
}

/** Shown in the storefront column so the admin can see what a shopper would. */
const VISIBILITY_LABEL: Record<ProductVisibility, string> = {
	SHOP_AND_SEARCH: "Shop and search",
	SHOP_ONLY: "Shop only",
	SEARCH_ONLY: "Search only",
	HIDDEN: "Hidden",
}

export interface ProductFilters {
	search: string
	status?: ProductStatus
	kind?: ProductKind
	categoryId?: string
	stockStatus?: StockStatus
}

export const ProductTable = ({
	products,
	filters,
	onFiltersChange,
	statusCounts,
	categories,
	onEdit,
	onCreate,
}: {
	products: AdminProduct[]
	filters: ProductFilters
	onFiltersChange: (filters: ProductFilters) => void
	statusCounts: StatusCounts
	categories: { id: string; name: string; depth: number; productCount: number }[]
	onEdit: (product: AdminProduct) => void
	onCreate: () => void
}) => {
	const [deleteProduct] = useDeleteProductMutation()
	const [selected, setSelected] = useState<Set<string>>(new Set())
	const [pending, setPending] = useState<AdminProduct[] | null>(null)
	const [isDeleting, setIsDeleting] = useState(false)

	const toggle = (id: string) =>
		setSelected((current) => {
			const next = new Set(current)
			if (next.has(id)) next.delete(id)
			else next.add(id)
			return next
		})

	const allSelected = products.length > 0 && products.every((p) => selected.has(p.id))
	const someSelected = selected.size > 0 && !allSelected

	const runDelete = async () => {
		if (!pending?.length) return
		setIsDeleting(true)

		let deleted = 0
		const failures: { name: string; message: string }[] = []

		for (const product of pending) {
			try {
				await deleteProduct(product.id).unwrap()
				deleted++
			} catch (error) {
				failures.push({
					name: product.name,
					message:
						(error as { data?: { message?: string } })?.data?.message ??
						"Could not be deleted.",
				})
			}
		}

		setIsDeleting(false)
		setPending(null)
		setSelected(new Set())

		if (deleted) toast.success(`${deleted} ${deleted === 1 ? "product" : "products"} deleted.`)
		// The API refuses a product still attached to another as an option.
		if (failures.length) toast.error(`“${failures[0].name}” — ${failures[0].message}`)
	}

	const defaultVariant = (product: AdminProduct) =>
		product.variants.find((v) => v.isDefault) ?? product.variants[0]

	return (
		<>
			<StatusLinks
				value={filters.status}
				onChange={(status) => onFiltersChange({ ...filters, status })}
				counts={statusCounts}
			/>

			<Toolbar
				searchValue={filters.search}
				onSearchChange={(search) => onFiltersChange({ ...filters, search })}
				searchPlaceholder="Search name or SKU…"
				filters={
					<div className="flex flex-wrap items-center gap-2">
						{/* Status lives in the links above the table, WordPress-style. */}
						<Select
							value={filters.categoryId ?? ANY}
							onValueChange={(value) =>
								onFiltersChange({
									...filters,
									categoryId: value === ANY ? undefined : value,
								})
							}
						>
							<SelectTrigger className="w-44" aria-label="Filter by category">
								<SelectValue placeholder="All categories" />
							</SelectTrigger>
							<SelectContent className="max-h-72">
								<SelectItem value={ANY}>All categories</SelectItem>
								{categories.map((category) => (
									<SelectItem key={category.id} value={category.id}>
										{/* Non-breaking spaces, because Radix renders the label
										    as plain text and collapses ordinary indentation. */}
										{"  ".repeat(category.depth)}
										{category.depth > 0 ? "— " : ""}
										{category.name}
										<span className="text-muted-foreground ml-1 tabular-nums">
											({category.productCount})
										</span>
									</SelectItem>
								))}
							</SelectContent>
						</Select>

						<Select
							value={filters.stockStatus ?? ANY}
							onValueChange={(value) =>
								onFiltersChange({
									...filters,
									stockStatus: value === ANY ? undefined : (value as StockStatus),
								})
							}
						>
							<SelectTrigger className="w-40" aria-label="Filter by stock status">
								<SelectValue placeholder="Any stock status" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value={ANY}>Any stock status</SelectItem>
								<SelectItem value="IN_STOCK">In stock</SelectItem>
								<SelectItem value="OUT_OF_STOCK">Out of stock</SelectItem>
								<SelectItem value="ON_BACKORDER">On backorder</SelectItem>
							</SelectContent>
						</Select>

						<Select
							value={filters.kind ?? ANY}
							onValueChange={(value) =>
								onFiltersChange({
									...filters,
									kind: value === ANY ? undefined : (value as ProductKind),
								})
							}
						>
							<SelectTrigger className="w-36" aria-label="Filter by kind">
								<SelectValue placeholder="Any kind" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value={ANY}>Any kind</SelectItem>
								<SelectItem value="MAIN">Main product</SelectItem>
								<SelectItem value="OPTION">Option</SelectItem>
							</SelectContent>
						</Select>
					</div>
				}
				selectedCount={selected.size}
				onClearSelection={() => setSelected(new Set())}
				selectionActions={
					<Button
						variant="destructive"
						size="lg"
						onClick={() => setPending(products.filter((p) => selected.has(p.id)))}
					>
						<Trash2 />
						Delete
					</Button>
				}
				primaryAction={
					<Button size="lg" onClick={onCreate}>
						<Plus />
						New product
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
											setSelected(checked ? new Set(products.map((p) => p.id)) : new Set())
										}
										aria-label="Select all products"
										disabled={!products.length}
									/>
								</TableHead>
								<TableHead className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
									Product
								</TableHead>
								<TableHead className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
									SKU
								</TableHead>
								<TableHead className="text-muted-foreground text-right text-xs font-medium tracking-wide uppercase">
									Price
								</TableHead>
								<TableHead className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
									Storefront
								</TableHead>
								<TableHead className="text-muted-foreground text-right text-xs font-medium tracking-wide uppercase">
									MOQ
								</TableHead>
								<TableHead className="text-muted-foreground text-right text-xs font-medium tracking-wide uppercase">
									Stock
								</TableHead>
								<TableHead className="w-16 pr-4" />
							</TableRow>
						</TableHeader>

						<TableBody>
							{!products.length && (
								<TableRow className="hover:bg-transparent">
									<TableCell colSpan={8} className="h-40 text-center">
										<p className="text-muted-foreground text-sm">
											{filters.search || filters.status || filters.kind
												? "Nothing matches these filters."
												: "No products yet. Create the first one to start the catalogue."}
										</p>
									</TableCell>
								</TableRow>
							)}

							{products.map((product) => {
								const isSelected = selected.has(product.id)
								const variant = defaultVariant(product)
								const en = product.translations.find((t) => t.locale === "en")

								return (
									<TableRow
										key={product.id}
										data-state={isSelected ? "selected" : undefined}
										className={cn(isSelected && "bg-accent-soft hover:bg-accent-soft")}
									>
										<TableCell className="pl-4">
											<Checkbox
												checked={isSelected}
												onCheckedChange={() => toggle(product.id)}
												aria-label={`Select ${product.name}`}
											/>
										</TableCell>

										<TableCell>
											<div className="flex flex-wrap items-center gap-1.5">
												{en?.slug ? (
													<Link
														href={getPathname({
															href: {
																pathname: "/products/[slug]",
																params: { slug: en.slug },
															},
															locale: "en",
														})}
														target="_blank"
														rel="noopener noreferrer"
														className="group inline-flex items-center gap-1.5 font-medium hover:underline"
													>
														{product.name}
														<ExternalLink className="text-muted-foreground size-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
													</Link>
												) : (
													<span className="font-medium">{product.name}</span>
												)}

												{/* Status is shown only when it is not the norm, the
												    way WordPress appends "— Draft". Repeating
												    "Published" on every row says nothing. */}
												{product.status !== "PUBLISHED" && (
													<span className="text-muted-foreground text-sm">
														— {product.status === "DRAFT" ? "Draft" : "Archived"}
													</span>
												)}
												{/* kind is a dashboard label only and must never reach
												    a public payload (§1B decision 4b). */}
												{product.kind === "OPTION" && (
													<span className="text-muted-foreground text-sm">— Option</span>
												)}
											</div>
										</TableCell>

										<TableCell className="text-muted-foreground font-mono text-xs">
											{variant?.sku ?? "—"}
											{product.variants.length > 1 && (
												<span className="ml-1">+{product.variants.length - 1}</span>
											)}
										</TableCell>

										<TableCell className="text-right tabular-nums">
											{product.quoteEnabled ? (
												<span className="text-muted-foreground text-xs">
													On request
												</span>
											) : (
												(displayPrice(product) ?? (
													<span className="text-muted-foreground">—</span>
												))
											)}
										</TableCell>

										<TableCell className="text-muted-foreground text-xs">
											{VISIBILITY_LABEL[product.visibility]}
										</TableCell>

										<TableCell className="text-right tabular-nums">
											{product.moq > 0 ? (
												product.moq
											) : (
												<span className="text-muted-foreground">—</span>
											)}
										</TableCell>

										<TableCell className="text-right tabular-nums">
											{variant?.manageStock ? (
												variant.stock
											) : (
												<span className="text-muted-foreground">∞</span>
											)}
										</TableCell>

										<TableCell className="pr-4">
											<div className="flex justify-end">
												<Button
													variant="ghost"
													size="icon"
													aria-label={`Edit ${product.name}`}
													onClick={() => onEdit(product)}
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

				{products.length > 0 && (
					<div className="text-muted-foreground border-t px-4 py-2.5 text-xs">
						{products.length} {products.length === 1 ? "product" : "products"}
						{selected.size > 0 && ` · ${selected.size} selected`}
					</div>
				)}
			</div>

			<AlertDialog open={!!pending} onOpenChange={(open) => !open && setPending(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							{pending?.length === 1
								? `Delete “${pending[0].name}”?`
								: `Delete ${pending?.length} products?`}
						</AlertDialogTitle>
						<AlertDialogDescription>
							This removes the product, its variants, prices and tier ladders in
							every language. A product attached to another as an option cannot be
							deleted — those will be skipped.
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

export default ProductTable
