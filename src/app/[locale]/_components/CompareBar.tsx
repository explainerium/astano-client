"use client"

import { useEffect } from "react"
import { useTranslations } from "next-intl"
import { Repeat, X } from "lucide-react"
import { Link } from "@/i18n/navigation"
import { useAppDispatch, useAppSelector } from "@/redux/hooks"
import { clearCompare, hydrateCompare, readStoredCompare } from "@/redux/slices/compareSlice"

/**
 * The compare tray.
 *
 * A bar rather than a badge, because the compare icon on a card gives no other
 * feedback: without this, ticking Compare looks exactly like doing nothing. It
 * shows how many are held and offers the only two things worth offering —
 * open the comparison, or empty it.
 *
 * Hidden until the store has read localStorage. Rendering a count during
 * hydration would have the server say "0" and the client say "3" on the same
 * paint, which is the classic mismatch.
 */
export const CompareBar = () => {
	const t = useTranslations("shop")
	const dispatch = useAppDispatch()
	const { ids, hydrated } = useAppSelector((state) => state.compare)

	/**
	 * The one effect this needs, and it belongs in one: reading a browser API
	 * that does not exist on the server. It runs once, and the reducer's own
	 * `hydrated` flag stops it mattering if React runs it twice.
	 */
	useEffect(() => {
		dispatch(hydrateCompare(readStoredCompare()))
	}, [dispatch])

	if (!hydrated || !ids.length) return null

	return (
		<div className="fixed inset-x-0 bottom-0 z-40 border-t bg-white shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
			<div className="mx-auto flex w-full max-w-[1400px] flex-wrap items-center gap-4 px-6 py-3.5">
				<span className="inline-flex items-center gap-2 text-sm font-medium">
					<Repeat className="text-primary size-4" />
					{t("comparing", { count: ids.length })}
				</span>

				<div className="ml-auto flex items-center gap-2">
					<button
						type="button"
						onClick={() => dispatch(clearCompare())}
						className="text-muted-foreground hover:text-destructive inline-flex items-center gap-1.5 px-3 py-2 text-sm transition-colors"
					>
						<X className="size-4" />
						{t("clearFilters")}
					</button>

					<Link
						href="/compare"
						className="bg-ink text-ink-foreground px-5 py-2.5 text-sm font-semibold tracking-wide uppercase transition-opacity hover:opacity-90"
					>
						{t("viewCompare")}
					</Link>
				</div>
			</div>
		</div>
	)
}

export default CompareBar
