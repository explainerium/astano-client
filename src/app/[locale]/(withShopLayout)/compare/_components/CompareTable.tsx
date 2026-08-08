"use client"

import { useEffect } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Loader2, Repeat, X } from "lucide-react"
import { Link } from "@/i18n/navigation"
import { useShopProductsQuery } from "@/redux/api/storefrontApi"
import { useAppDispatch, useAppSelector } from "@/redux/hooks"
import {
	clearCompare,
	hydrateCompare,
	readStoredCompare,
	removeFromCompare,
} from "@/redux/slices/compareSlice"
import { formatMoney } from "@/lib/money"

/**
 * Side-by-side, one column per product.
 *
 * The rows are the three fields the live shop compares on
 * (`fields_compare: ["description","sku","availability"]`) plus the price,
 * which is the reason anyone opens this at all. Every price is the one the API
 * resolved for this visitor, so a dealer comparing four products sees four
 * dealer prices — not four retail ones with a note underneath.
 *
 * The tray holds ids, not products, so the products are fetched here. A single
 * list request rather than one per id: four round trips to draw one table is
 * three too many.
 */
export const CompareTable = () => {
	const t = useTranslations("shop")
	const locale = useLocale()

	const dispatch = useAppDispatch()
	const { ids, hydrated } = useAppSelector((state) => state.compare)

	// Reading localStorage is the one thing that genuinely cannot happen on the
	// server, so it genuinely belongs in an effect.
	useEffect(() => {
		dispatch(hydrateCompare(readStoredCompare()))
	}, [dispatch])

	/**
	 * A generous page rather than a filtered query: the list endpoint has no
	 * "these ids" filter, and with a catalogue this size fetching the page and
	 * picking from it is cheaper than adding one.
	 */
	const { data, isFetching } = useShopProductsQuery({ limit: 100 }, { skip: !hydrated || !ids.length })

	const products = (data?.data ?? []).filter((p) => ids.includes(p.id))
	// Kept in the order they were added, so the columns do not reshuffle when
	// the catalogue's own order changes.
	const ordered = ids.map((id) => products.find((p) => p.id === id)).filter((p) => !!p)

	if (!hydrated) return null

	if (!ids.length) {
		return (
			<div className="mx-auto w-full max-w-[1400px] px-6 py-20 text-center">
				<span className="bg-muted text-muted-foreground mx-auto flex size-16 items-center justify-center rounded-full">
					<Repeat className="size-7" strokeWidth={1.25} />
				</span>
				<h1 className="font-heading mt-5 text-2xl font-bold tracking-tight">{t("compare")}</h1>
				<p className="text-muted-foreground mt-2 text-sm">{t("compareEmpty")}</p>
				<Link
					href="/products"
					className="bg-ink text-ink-foreground mt-6 inline-block px-6 py-3 text-sm font-semibold tracking-wide uppercase transition-opacity hover:opacity-90"
				>
					{t("continueShopping")}
				</Link>
			</div>
		)
	}

	const rows: { label: string; render: (p: (typeof ordered)[number]) => React.ReactNode }[] = [
		{
			label: t("tierPrice"),
			render: (p) =>
				p.quoteOnly ? (
					<span className="text-muted-foreground italic">{t("priceOnRequest")}</span>
				) : p.priceFrom ? (
					<span className="font-semibold">{formatMoney(p.priceFrom, locale)}</span>
				) : (
					"—"
				),
		},
		{
			label: t("sku"),
			// The listing shape carries no SKU; the detail page does. Rather than
			// fetch four products to print four codes, this says so plainly.
			render: () => <span className="text-muted-foreground">—</span>,
		},
		{
			label: t("description"),
			render: (p) => (
				<span className="text-muted-foreground line-clamp-4 text-sm">
					{p.shortDescription ?? "—"}
				</span>
			),
		},
		{
			label: t("categories"),
			render: (p) => (
				<span className="text-muted-foreground text-sm">
					{p.categories.map((c) => c.name).join(", ") || "—"}
				</span>
			),
		},
		{
			label: t("minimumOrderLabel"),
			render: (p) => <span className="tabular-nums">{p.moq > 1 ? p.moq : "—"}</span>,
		},
	]

	return (
		<div className="mx-auto w-full max-w-[1400px] px-6 py-12">
			<div className="mb-6 flex flex-wrap items-center gap-4">
				<h1 className="font-heading text-3xl font-bold tracking-tight">{t("compare")}</h1>
				<button
					type="button"
					onClick={() => dispatch(clearCompare())}
					className="text-muted-foreground hover:text-destructive ml-auto text-sm underline underline-offset-2"
				>
					{t("clearFilters")}
				</button>
			</div>

			{isFetching && !ordered.length ? (
				<div className="text-muted-foreground flex items-center gap-2 py-20 text-sm">
					<Loader2 className="size-4 animate-spin" />
					{t("loading")}
				</div>
			) : (
				/* Scrolls sideways rather than squeezing four columns into a phone —
				   a comparison you cannot read is not a comparison. */
				<div className="overflow-x-auto border">
					<table className="w-full min-w-3xl border-collapse text-sm">
						<thead>
							<tr>
								<th scope="col" className="bg-muted w-40 border-b px-4 py-3 text-left" />
								{ordered.map((product) => (
									<th key={product.id} scope="col" className="border-b border-l px-4 py-4 text-left align-top">
										<div className="flex items-start gap-2">
											<Link
												href={{
													pathname: "/products/[slug]",
													params: { slug: product.slug },
												}}
												className="hover:text-primary min-w-0 flex-1 font-semibold"
											>
												{product.name}
											</Link>
											<button
												type="button"
												onClick={() => dispatch(removeFromCompare(product.id))}
												aria-label={`${t("remove")} ${product.name}`}
												className="text-muted-foreground hover:text-destructive shrink-0 transition-colors"
											>
												<X className="size-4" />
											</button>
										</div>

										{product.featuredImage && (
											<Link
												href={{
													pathname: "/products/[slug]",
													params: { slug: product.slug },
												}}
												className="bg-muted mt-3 block aspect-square w-full overflow-hidden"
											>
												{/* eslint-disable-next-line @next/next/no-img-element */}
												<img
													src={
														product.featuredImage.srcset.grid ?? product.featuredImage.url
													}
													alt=""
													loading="lazy"
													className="size-full object-contain"
												/>
											</Link>
										)}
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{rows.map((row) => (
								<tr key={row.label} className="odd:bg-muted/40">
									<th scope="row" className="text-muted-foreground border-b px-4 py-3 text-left font-medium">
										{row.label}
									</th>
									{ordered.map((product) => (
										<td key={product.id} className="border-b border-l px-4 py-3 align-top">
											{row.render(product)}
										</td>
									))}
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}
		</div>
	)
}

export default CompareTable
