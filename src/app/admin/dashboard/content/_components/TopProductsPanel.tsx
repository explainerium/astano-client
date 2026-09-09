"use client"

import { useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { EyeOff, GripVertical, ImageOff, Loader2, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
	useAdminProductsQuery,
	useSetTopProductsMutation,
	useTopProductsQuery,
} from "@/redux/api/productApi"
import { cn } from "@/lib/utils"
import type { AdminProduct, TopProduct } from "@/types/product"

/**
 * Which products lead the home page, and in what order.
 *
 * Both halves of that were already in the product editor — a "Top-Produkt" tick
 * and, until now, a number — but split across fifty-six product pages, which is
 * not where anybody goes to arrange a row of twelve. The shop asked to "switch
 * and sort order the top products"; sorting something means seeing it beside
 * the things it is being sorted against.
 *
 * So this sits on the Startseite content screen, under the section it belongs
 * to, and shows the strip the way the page shows it. The tick in the product
 * editor still works and still means the same flag — this is a second door to
 * the same room, not a second source of truth.
 *
 * ── Why it is not part of the form around it ────────────────────────────────
 *
 * The fields on this screen are catalogue strings and save through /content.
 * This is the catalogue itself and saves through /admin/products. Folding it
 * into that form would mean one Save writing to two APIs, where half of it
 * could fail — and a nested <form> is invalid HTML besides. It carries its own
 * button, and every button in here is `type="button"` so the form outside
 * cannot be submitted by one.
 */

/** The strip as an ordered list of ids — what the server is sent. */
const idsOf = (rows: TopProduct[]): string[] => rows.map((row) => row.id)

const thumbnailOf = (image: TopProduct["image"]): string | null => {
	if (!image) return null
	return image.srcset.thumb ?? image.srcset.grid ?? image.url
}

/**
 * A product the picker offers, from the admin list, in the shape this screen
 * draws. Only what a row needs — the list already loaded the rest and this
 * screen has no use for it.
 */
const toRow = (product: AdminProduct): TopProduct => ({
	id: product.id,
	name: product.name,
	sku: product.variants[0]?.sku ?? null,
	image: product.featuredImage,
	status: product.status,
	visibility: product.visibility,
	live:
		product.status === "PUBLISHED" &&
		(product.visibility === "SHOP_AND_SEARCH" || product.visibility === "SHOP_ONLY"),
})

/** Accent- and case-insensitive matching, as ProCombobox does it. */
const fold = (value: string): string =>
	value
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.toLowerCase()

export const TopProductsPanel = () => {
	const t = useTranslations("admin")
	const c = useTranslations("adminCommon")

	const { data, isLoading, isError } = useTopProductsQuery()
	const [setTopProducts, { isLoading: isSaving }] = useSetTopProductsMutation()

	/**
	 * Only main products are offered.
	 *
	 * The option products — forty-three of the fifty-six — are the packaging and
	 * engraving lines sold *inside* another product's page. They are hidden from
	 * the catalogue by design, so one on the home page would be a tile a
	 * customer cannot open.
	 */
	const { data: candidates } = useAdminProductsQuery({ kind: "MAIN", limit: 200 })

	/**
	 * The order being edited, as ids.
	 *
	 * `null` until the server answers, so the first render does not commit to an
	 * empty strip and then replace it — which would flash "nothing chosen" on a
	 * page that has twelve products on it.
	 */
	const [draft, setDraft] = useState<string[] | null>(null)
	const [dragging, setDragging] = useState<number | null>(null)
	const [over, setOver] = useState<number | null>(null)
	const [search, setSearch] = useState("")
	const [picking, setPicking] = useState(false)

	const saved = useMemo(() => data?.data ?? [], [data])
	const limit = data?.limit ?? 12

	const order = draft ?? idsOf(saved)

	/**
	 * Everything this screen can draw a row for.
	 *
	 * The saved strip and the pickable catalogue merged, because a product added
	 * before Save exists in the draft order but not yet in the saved list — and
	 * without this its row would have an id and no name.
	 */
	const byId = useMemo(() => {
		const map = new Map<string, TopProduct>()
		for (const product of candidates?.data ?? []) map.set(product.id, toRow(product))
		// The saved rows win: they came from the same query the storefront runs,
		// so where the two disagree the strip's own answer is the right one.
		for (const row of saved) map.set(row.id, row)
		return map
	}, [candidates, saved])

	const rows = order.map((id) => byId.get(id)).filter((row): row is TopProduct => Boolean(row))

	const dirty = useMemo(() => {
		const current = idsOf(saved)
		return order.length !== current.length || order.some((id, i) => id !== current[i])
	}, [order, saved])

	const available = (candidates?.data ?? [])
		.filter((product) => !order.includes(product.id))
		.filter((product) => {
			if (!search.trim()) return true
			const needle = fold(search.trim())
			return fold(product.name).includes(needle) || fold(product.variants[0]?.sku ?? "").includes(needle)
		})

	const move = (from: number, to: number) => {
		const next = [...order]
		const [carried] = next.splice(from, 1)
		if (carried === undefined) return
		next.splice(to, 0, carried)
		setDraft(next)
	}

	/**
	 * Full, so nothing more may be added.
	 *
	 * Disabling the button rather than letting a thirteenth be chosen and then
	 * refused on Save: the API does refuse it, but finding that out after
	 * arranging the row is a worse way to learn the ceiling than a button that
	 * has stopped offering.
	 */
	const full = order.length >= limit

	const endDrag = () => {
		setDragging(null)
		setOver(null)
	}

	const onSave = async () => {
		try {
			await setTopProducts({ productIds: order }).unwrap()
			// Back to reading from the server: the mutation answers with the strip
			// as stored, and holding a draft over it would keep showing what was
			// sent rather than what was kept.
			setDraft(null)
			toast.success(c("saved"))
		} catch (error) {
			const message = (error as { data?: { message?: string } })?.data?.message
			toast.error(message ?? c("saveFailed"))
		}
	}

	if (isLoading) {
		return (
			<div className="text-muted-foreground flex items-center justify-center gap-2 rounded-lg border border-dashed p-10 text-sm">
				<Loader2 className="size-4 animate-spin" />
			</div>
		)
	}

	if (isError) {
		return (
			<p className="text-destructive rounded-lg border border-dashed p-10 text-center text-sm">
				{c("loadFailed")}
			</p>
		)
	}

	return (
		<div className="space-y-3">
			<div className="flex flex-wrap items-baseline justify-between gap-2">
				<p className="text-muted-foreground max-w-prose text-xs">{t("topProductsBlurb")}</p>
				<span
					className={cn(
						"text-muted-foreground shrink-0 text-xs tabular-nums",
						order.length > limit && "text-destructive font-medium"
					)}
				>
					{order.length} / {limit}
				</span>
			</div>

			{!rows.length ? (
				<p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-xs">
					{t("noTopProductsYet")}
				</p>
			) : (
				<ul className="space-y-2">
					{rows.map((row, index) => {
						const isDragging = dragging === index
						const isTarget = over === index && dragging !== null && dragging !== index
						const thumbnail = thumbnailOf(row.image)
						/*
						 * Past the ceiling, so it is in the list and not on the page.
						 *
						 * The storefront asks for twelve. A thirteenth row saves without
						 * complaint and appears nowhere, which reads as the save having
						 * failed — so it says which rows those are rather than leaving it
						 * to be discovered on the live site.
						 */
						const beyond = index >= limit

						return (
							<li
								key={row.id}
								onDragOver={(event) => {
									if (dragging === null || dragging === index) return
									// Without this the drop is refused and nothing moves.
									event.preventDefault()
									setOver(index)
								}}
								onDragLeave={() => setOver((current) => (current === index ? null : current))}
								onDrop={(event) => {
									if (dragging === null || dragging === index) return
									event.preventDefault()
									move(dragging, index)
									endDrag()
								}}
								className={cn(
									"bg-card flex items-center gap-3 rounded-lg border p-2 transition-all",
									isDragging && "border-primary scale-[0.99] opacity-40",
									isTarget && "border-primary ring-primary/40 ring-2",
									beyond && "opacity-60"
								)}
							>
								{/*
								 * The handle is what is draggable, not the row — the same
								 * rule the option rows follow, so selecting the product name
								 * does not start a drag.
								 */}
								<button
									type="button"
									draggable
									onDragStart={() => setDragging(index)}
									onDragEnd={endDrag}
									aria-label={t("reorderNumbered", { index: index + 1 })}
									className="text-muted-foreground/60 hover:text-foreground shrink-0 cursor-grab active:cursor-grabbing"
								>
									<GripVertical className="size-4" />
								</button>

								<span className="text-muted-foreground w-5 shrink-0 text-center text-xs tabular-nums">
									{index + 1}
								</span>

								<div className="bg-muted size-10 shrink-0 overflow-hidden rounded-md border">
									{thumbnail ? (
										// Plain img, not next/image: already a sized WebP
										// derivative, so re-optimising gains nothing.
										// eslint-disable-next-line @next/next/no-img-element
										<img src={thumbnail} alt="" loading="lazy" className="size-full object-cover" />
									) : (
										<div className="text-muted-foreground flex size-full items-center justify-center">
											<ImageOff className="size-4" />
										</div>
									)}
								</div>

								<div className="min-w-0 flex-1">
									<p className="truncate text-sm font-medium">{row.name}</p>
									<p className="text-muted-foreground truncate text-xs">{row.sku ?? "—"}</p>
								</div>

								{/* Ticked but invisible to a shopper — a draft, or hidden from
								    the catalogue. It would sit in this list and appear on no
								    page, so the row says so. */}
								{!row.live && (
									<Badge variant="outline" className="shrink-0 gap-1 text-[10px]">
										<EyeOff className="size-3" />
										{t("notVisibleOnTheSite")}
									</Badge>
								)}

								{beyond && (
									<Badge variant="outline" className="text-destructive shrink-0 text-[10px]">
										{t("beyondTheStrip")}
									</Badge>
								)}

								<Button
									type="button"
									variant="ghost"
									size="icon"
									className="text-muted-foreground hover:text-destructive shrink-0"
									aria-label={t("removeNumbered", { thing: t("topProduct"), index: index + 1 })}
									onClick={() => setDraft(order.filter((id) => id !== row.id))}
								>
									<Trash2 />
								</Button>
							</li>
						)
					})}
				</ul>
			)}

			<div className="flex flex-wrap items-center justify-between gap-2">
				<Popover
					open={picking}
					onOpenChange={(open) => {
						setPicking(open)
						if (!open) setSearch("")
					}}
				>
					<PopoverTrigger asChild>
						<Button type="button" variant="outline" size="sm" disabled={full}>
							<Plus />
							{full ? t("stripIsFull", { limit }) : t("addProduct")}
						</Button>
					</PopoverTrigger>
					<PopoverContent align="start" className="w-80 p-0">
						<div className="border-b p-2">
							<Input
								value={search}
								onChange={(event) => setSearch(event.target.value)}
								placeholder={t("searchProducts")}
								className="h-8"
							/>
						</div>
						<div className="max-h-72 overflow-y-auto p-1">
							{!available.length ? (
								<p className="text-muted-foreground p-4 text-center text-xs">
									{t("noProductsLeftToAdd")}
								</p>
							) : (
								available.map((product) => (
									<button
										key={product.id}
										type="button"
										onClick={() => {
											setDraft([...order, product.id])
											setPicking(false)
											setSearch("")
										}}
										className="hover:bg-muted flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left"
									>
										<span className="min-w-0 flex-1 truncate text-sm">{product.name}</span>
										<span className="text-muted-foreground shrink-0 text-xs">
											{product.variants[0]?.sku ?? ""}
										</span>
									</button>
								))
							)}
						</div>
					</PopoverContent>
				</Popover>

				<div className="flex items-center gap-2">
					{dirty && (
						<Button type="button" variant="ghost" size="sm" onClick={() => setDraft(null)}>
							{t("cancel")}
						</Button>
					)}
					<Button type="button" size="sm" disabled={!dirty || isSaving} onClick={onSave}>
						{isSaving && <Loader2 className="size-4 animate-spin" />}
						{c("save")}
					</Button>
				</div>
			</div>
		</div>
	)
}

export default TopProductsPanel
