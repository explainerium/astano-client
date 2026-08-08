"use client"

import { useTranslations } from "next-intl"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Numbered pages, the way the live shop paginates (`shop_pagination: pagination`).
 *
 * Prev/next alone tells a shopper how far they have come but never how far
 * there is to go, and it makes page 7 seven clicks away. Numbers answer both.
 *
 * The window is first · … · a few around the current page · … · last, so the
 * control stays the same width whether there are three pages or ninety.
 */
const windowed = (page: number, total: number): (number | "gap")[] => {
	if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

	const pages = new Set<number>([1, total, page])
	// Two either side keeps the current page visually centred while it can be.
	for (const offset of [-2, -1, 1, 2]) {
		const n = page + offset
		if (n > 1 && n < total) pages.add(n)
	}

	const sorted = [...pages].sort((a, b) => a - b)
	const out: (number | "gap")[] = []

	sorted.forEach((n, i) => {
		// A gap only where one is genuinely skipped — "1 … 2" is nonsense.
		if (i > 0 && n - sorted[i - 1] > 1) out.push("gap")
		out.push(n)
	})

	return out
}

export const Pagination = ({
	page,
	totalPages,
	onPage,
}: {
	page: number
	totalPages: number
	onPage: (page: number) => void
}) => {
	const t = useTranslations("shop")

	if (totalPages <= 1) return null

	const cell =
		"inline-flex h-10 min-w-10 items-center justify-center border px-3 text-sm transition-colors"

	return (
		<nav aria-label={t("pagination")} className="mt-12 flex flex-wrap items-center justify-center gap-1.5">
			<button
				type="button"
				onClick={() => onPage(page - 1)}
				disabled={page <= 1}
				aria-label={t("previous")}
				className={cn(cell, "hover:border-primary hover:text-primary disabled:opacity-40 disabled:hover:border-inherit disabled:hover:text-inherit")}
			>
				<ChevronLeft className="size-4" />
			</button>

			{windowed(page, totalPages).map((entry, index) =>
				entry === "gap" ? (
					<span
						key={`gap-${index}`}
						aria-hidden
						className="text-muted-foreground inline-flex h-10 items-center px-1 text-sm"
					>
						…
					</span>
				) : (
					<button
						key={entry}
						type="button"
						onClick={() => onPage(entry)}
						aria-current={entry === page ? "page" : undefined}
						aria-label={t("goToPage", { page: entry })}
						className={cn(
							cell,
							"tabular-nums",
							entry === page
								? "border-primary bg-primary text-primary-foreground font-semibold"
								: "hover:border-primary hover:text-primary"
						)}
					>
						{entry}
					</button>
				)
			)}

			<button
				type="button"
				onClick={() => onPage(page + 1)}
				disabled={page >= totalPages}
				aria-label={t("next")}
				className={cn(cell, "hover:border-primary hover:text-primary disabled:opacity-40 disabled:hover:border-inherit disabled:hover:text-inherit")}
			>
				<ChevronRight className="size-4" />
			</button>
		</nav>
	)
}

export default Pagination
