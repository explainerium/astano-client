"use client"

import { useState } from "react"
import Link from "next/link"
import {
	Copy,
	Download,
	ExternalLink,
	ImageOff,
	Loader2,
	Pencil,
	Plus,
	Trash2,
	Upload,
} from "lucide-react"
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
import { useDeleteProductMutation, useDuplicateProductMutation } from "@/redux/api/productApi"
import { downloadFile } from "@/lib/downloadFile"
import { cn } from "@/lib/utils"
import type {
	AdminProduct,
	ProductKind,
	ProductPrice,
	ProductStatus,
	StockStatus,
} from "@/types/product"
import useMoney from "@/lib/useMoney"
import type { MoneyFormatter } from "@/lib/money"
const ANY = "__any__"


/**
 * The price a normal retail customer sees.
 *
 * Variant prices are checked before product prices (§1C). This column is
 * indicative only; the real figure depends on role and quantity and is resolved
 * server-side by resolvePrice().
 *
 * The role order mirrors that resolver's own GUEST chain — `GUEST` then `B2C`.
 * It used to look for `B2C` alone, and the product editor writes retail to
 * `GUEST` (that is where the fallback chain terminates, so it covers both a
 * guest and a signed-in customer with no row of their own). The result was a
 * PRICE column that was empty for every product the editor had ever created,
 * priced or not.
 */
const RETAIL_ROLES = ["GUEST", "B2C"] as const

const retailRow = (rows: ProductPrice[] | undefined) => {
	if (!rows?.length) return undefined
	for (const role of RETAIL_ROLES) {
		const row = rows.find((p) => p.role === role)
		if (row) return row
	}
	return undefined
}

/**
 * Whether a sale price is in effect right now.
 *
 * Same three conditions as the API's `saleActive()`: a price is set, the start
 * has passed, the end has not. A scheduled sale is deliberately not shown as
 * live — the column has to agree with what a shopper is being charged today,
 * and a strikethrough for a sale that starts next month would be a lie.
 */
const saleActive = (row: ProductPrice): boolean => {
	if (row.salePrice === null || row.salePrice === undefined || row.salePrice === "") return false

	const now = Date.now()
	if (row.saleStartsAt && now < new Date(row.saleStartsAt).getTime()) return false
	if (row.saleEndsAt && now > new Date(row.saleEndsAt).getTime()) return false
	return true
}

/**
 * Regular and sale price together, the way WooCommerce prints them: the regular
 * struck through, the sale beside it.
 *
 * `sale` is null unless one is set and currently running, in which case the two
 * are shown together — a lone number in this column is the price being charged,
 * never an obsolete one.
 */
const displayPrice = (
	product: AdminProduct,
	formatMoney: MoneyFormatter
): { regular: string; sale: string | null } | null => {
	const variant = product.variants.find((v) => v.isDefault) ?? product.variants[0]
	const row = retailRow(variant?.prices) ?? retailRow(product.prices)
	if (!row) return null

	const regular = formatMoney(Number(row.basePrice))
	// A row with an unreadable base price has no price to show at all, which is
	// what the column's own empty state is for.
	if (!regular) return null

	return {
		regular,
		sale: saleActive(row) ? formatMoney(Number(row.salePrice)) : null,
	}
}

/**
 * The smallest derivative that exists — never the original, for a 40px cell.
 *
 * Deliberately the featured image only, with no fall back to the first gallery
 * image: this column should show what a shopper sees in a listing, and a
 * product with no featured image shows a placeholder there too.
 */
const thumbnailOf = (product: AdminProduct): string | null => {
	const image = product.featuredImage
	if (!image) return null
	return image.srcset.thumb ?? image.srcset.grid ?? image.url
}

/**
 * Colour carries state, not taxonomy.
 *
 * Green means live and findable, red means shoppers cannot see it, grey means
 * it is not in circulation. Someone scanning the column should be able to tell
 * "fine" from "needs a look" without reading a single word — so the palette
 * stops at three meanings and the rest stays quiet.
 *
 * All four use the admin theme's own tokens rather than raw palette colours, so
 * a change to the theme carries through here.
 */
const STATUS_CHIP: Record<ProductStatus, { label: string; className: string }> = {
	PUBLISHED: { label: "Published", className: "border-transparent bg-positive-soft text-positive" },
	DRAFT: { label: "Draft", className: "border-transparent bg-muted text-foreground" },
	// Outline kept, so retired reads fainter than merely unpublished.
	ARCHIVED: { label: "Archived", className: "text-muted-foreground" },
}

/** Shoppers cannot find it. The one genuine warning in this column. */
const HIDDEN_CHIP = "border-transparent bg-negative-soft text-negative"

/**
 * A configurator component rather than something you would shop for — roughly
 * two in five of the catalogue (§2.1), so it is worth spotting. The brand
 * accent rather than a state colour, because it says *what this is*, not
 * whether anything is wrong. The strong tint, so it stays legible on a selected
 * row, which is tinted with the soft one.
 */
const OPTION_CHIP = "border-transparent bg-accent-soft-strong text-primary"

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
	// The shop's own separators and symbol. A function rather than an import,
	// so React Compiler can see that these prices depend on it.
	const formatMoney = useMoney()

	const [deleteProduct] = useDeleteProductMutation()
	const [duplicateProduct] = useDuplicateProductMutation()
	const [selected, setSelected] = useState<Set<string>>(new Set())
	const [pending, setPending] = useState<AdminProduct[] | null>(null)
	const [isDeleting, setIsDeleting] = useState(false)
	const [exporting, setExporting] = useState(false)

	const runExport = async () => {
		setExporting(true)

		try {
			const stamp = new Date().toISOString().slice(0, 10)
			await downloadFile("/admin/products-io/export", `astano-products-${stamp}.csv`)
		} catch {
			toast.error("Could not build the export.")
		}

		setExporting(false)
	}

	/**
	 * Which row is being copied.
	 *
	 * An id rather than a boolean because it does two jobs: the spinner belongs
	 * to one row, while the disabled state covers all of them — a copy ends by
	 * opening the editor, so two started at once would race to open two and the
	 * loser's work would be invisible.
	 */
	const [duplicatingId, setDuplicatingId] = useState<string | null>(null)

	/**
	 * Copies the product and opens the copy.
	 *
	 * Landing in the editor is the point: nobody duplicates a product to look at
	 * a list, they duplicate it to change the two fields that differ. The copy
	 * is a draft, so it is not in the shop while that happens — the toast says
	 * so, because a new row appearing further down a list sorted by update time
	 * is easy to miss.
	 */
	const runDuplicate = async (product: AdminProduct) => {
		setDuplicatingId(product.id)
		try {
			const copy = await duplicateProduct(product.id).unwrap()
			toast.success(`“${product.name}” duplicated`, {
				description: "The copy is a draft. Give it a SKU and publish it when it is ready.",
			})
			onEdit(copy)
		} catch (error) {
			toast.error("Could not duplicate this product", {
				description:
					(error as { data?: { message?: string } })?.data?.message ?? "Please try again.",
			})
		} finally {
			setDuplicatingId(null)
		}
	}

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

	/**
	 * Names for the ids the product carries.
	 *
	 * Walked in `categories` order rather than the product's, so every row lists
	 * them in the same catalogue-tree order instead of whatever order the join
	 * came back in. The list is already here for the filter dropdown, so this
	 * costs no extra request.
	 */
	const categoryNamesFor = (product: AdminProduct) =>
		categories.filter((c) => product.categoryIds.includes(c.id)).map((c) => c.name)

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
					<div className="flex flex-wrap gap-2">
						{/* Beside New product, as WooCommerce puts them. */}
						<Button variant="outline" size="lg" disabled={exporting} onClick={runExport}>
							{exporting ? <Loader2 className="animate-spin" /> : <Download />}
							Export
						</Button>
						<Button asChild variant="outline" size="lg">
							<Link href="/admin/dashboard/products/import">
								<Upload />
								Import
							</Link>
						</Button>
						<Button size="lg" onClick={onCreate}>
							<Plus />
							New product
						</Button>
					</div>
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
								<TableHead className="w-16">
									<span className="sr-only">Image</span>
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
									Categories
								</TableHead>
								<TableHead className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
									Author
								</TableHead>
								<TableHead className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
									Status
								</TableHead>
								<TableHead className="text-muted-foreground text-right text-xs font-medium tracking-wide uppercase">
									MOQ
								</TableHead>
								<TableHead className="text-muted-foreground text-right text-xs font-medium tracking-wide uppercase">
									Stock
								</TableHead>
								<TableHead className="w-32 pr-4" />
							</TableRow>
						</TableHeader>

						<TableBody>
							{!products.length && (
								<TableRow className="hover:bg-transparent">
									<TableCell colSpan={11} className="h-40 text-center">
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
								const thumbnail = thumbnailOf(product)
								const productCategories = categoryNamesFor(product)
								const status = STATUS_CHIP[product.status]
								const price = displayPrice(product, formatMoney)

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
											{/* Decorative: the name is in the very next cell, so
											    announcing the image again is noise. */}
											<div className="bg-muted size-10 overflow-hidden rounded-md border">
												{thumbnail ? (
													// Plain img, not next/image: already a sized WebP
													// derivative, so re-optimising gains nothing.
													// eslint-disable-next-line @next/next/no-img-element
													<img
														src={thumbnail}
														alt=""
														loading="lazy"
														className="size-full object-cover"
													/>
												) : (
													<div className="text-muted-foreground flex size-full items-center justify-center">
														<ImageOff className="size-4" />
													</div>
												)}
											</div>
										</TableCell>

										{/* Name only. Status, kind and visibility moved to their
										    own columns, where they line up down the page and can
										    be compared at a glance instead of trailing off after
										    names of wildly different lengths. */}
										<TableCell>
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
										</TableCell>

										<TableCell className="text-muted-foreground font-mono text-xs">
											{variant?.sku ?? "—"}
											{product.variants.length > 1 && (
												<span className="ml-1">+{product.variants.length - 1}</span>
											)}
										</TableCell>

										{/* Both prices, WooCommerce's way round: the regular struck
										    through, the sale after it. Stacked rather than inline so
										    the column keeps one number per line and the figures stay
										    aligned down the page. */}
										<TableCell className="text-right tabular-nums">
											{product.quoteEnabled ? (
												<span className="text-muted-foreground text-xs">
													On request
												</span>
											) : price ? (
												price.sale ? (
													<div className="flex flex-col items-end leading-tight">
														<span className="text-muted-foreground text-xs line-through">
															{price.regular}
														</span>
														<span className="text-positive font-medium">{price.sale}</span>
													</div>
												) : (
													price.regular
												)
											) : (
												<span className="text-muted-foreground">—</span>
											)}
										</TableCell>

										{/*
										 * `truncate`, not a width cap on its own.
										 *
										 * TableCell sets `whitespace-nowrap`, so a `max-w-*` with
										 * no overflow rule gives a box narrower than its text and
										 * says nothing about the rest — a product in four
										 * categories painted its list straight across the Author
										 * column beside it. `truncate` supplies the missing
										 * `overflow-hidden`, and the full list moves to the title
										 * so nothing is lost.
										 */}
										<TableCell className="text-muted-foreground max-w-56 truncate text-xs">
											{productCategories.length ? (
												<span title={productCategories.join(", ")}>
													{productCategories.join(", ")}
												</span>
											) : (
												<span>Uncategorised</span>
											)}
										</TableCell>

										{/*
										 * Who added the product.
										 *
										 * Em dash for the products that predate the column and for
										 * those whose author's account has since been deleted — the
										 * catalogue outlives the staff who built it, and "—" says
										 * "not recorded" without inventing a name for it. The email
										 * goes in the title so two colleagues sharing a first name
										 * are still tellable apart.
										 */}
										<TableCell className="text-muted-foreground max-w-40 truncate text-xs">
											{product.createdBy ? (
												<span title={product.createdBy.email}>{product.createdBy.name}</span>
											) : (
												"—"
											)}
										</TableCell>

										{/*
										 * One column, up to three chips: the state, then whatever
										 * is unusual about it.
										 *
										 * Merging is what lets "Main" disappear. Under a column
										 * headed "Type" a blank cell reads as missing data, so the
										 * norm had to be spelled out on every row; under one headed
										 * "Status" nothing promises a type, so only Option — the
										 * exception — needs saying. One fewer column and one fewer
										 * chip per row.
										 */}
										<TableCell>
											<div className="flex flex-wrap items-center gap-1">
												<Badge variant="outline" className={status.className}>
													{status.label}
												</Badge>

												{/* Orthogonal to status — a product can be published
												    and still invisible to shoppers, which is exactly
												    the combination worth catching. */}
												{product.visibility === "HIDDEN" && (
													<Badge variant="outline" className={HIDDEN_CHIP}>
														Hidden
													</Badge>
												)}

												{product.kind === "OPTION" && (
													<Badge variant="outline" className={OPTION_CHIP}>
														Option
													</Badge>
												)}
											</div>
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

										{/* Delete alongside edit, so a single product can go without
										    first being ticked and sent through the bulk bar. It opens
										    the same confirmation — one product is just a list of one,
										    and the dialog already words that case. */}
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
												<Button
													variant="ghost"
													size="icon"
													aria-label={`Duplicate ${product.name}`}
													title="Duplicate"
													// Every copy button, not just this row's: two copies
													// started at once would open two editors, and the
													// second would win.
													disabled={duplicatingId !== null}
													onClick={() => runDuplicate(product)}
												>
													{duplicatingId === product.id ? (
														<Loader2 className="animate-spin" />
													) : (
														<Copy />
													)}
												</Button>
												<Button
													variant="ghost"
													size="icon"
													aria-label={`Delete ${product.name}`}
													onClick={() => setPending([product])}
													className="text-muted-foreground hover:text-destructive"
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
