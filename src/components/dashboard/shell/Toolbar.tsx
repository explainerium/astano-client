"use client"

import { useTranslations } from "next-intl"
import type { ReactNode } from "react"
import { Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export interface ToolbarProps {
	searchValue?: string
	onSearchChange?: (value: string) => void
	searchPlaceholder?: string
	/** Dropdowns that narrow the list — status, kind, and so on. */
	filters?: ReactNode
	/** 0 hides the selection block without removing the row. */
	selectedCount?: number
	onClearSelection?: () => void
	/** Buttons that act on the selection — move, delete, export. */
	selectionActions?: ReactNode
	/** The screen's main action, e.g. "New category". Always visible. */
	primaryAction?: ReactNode
}

/**
 * The toolbar every admin list screen sits under.
 *
 * The row is **always rendered at a fixed minimum height**, and selecting rows
 * only changes what is inside it. An earlier version revealed a separate bar on
 * first selection, which shoved the table down the page at the exact moment
 * someone was aiming at a checkbox — so this exists to make that impossible to
 * reintroduce screen by screen.
 */
export const Toolbar = ({
	searchValue,
	onSearchChange,
	searchPlaceholder = "Search…",
	filters,
	selectedCount = 0,
	onClearSelection,
	selectionActions,
	primaryAction,
}: ToolbarProps) => {
	const t = useTranslations("admin")

	return (
	<div className="flex min-h-9 flex-wrap items-center gap-2">
		{onSearchChange && (
			<div className="relative min-w-56 flex-1 sm:max-w-xs">
				<Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
				<Input
					value={searchValue ?? ""}
					onChange={(event) => onSearchChange(event.target.value)}
					placeholder={searchPlaceholder}
					className="pl-9"
					aria-label={searchPlaceholder}
				/>
			</div>
		)}

		{filters}

		<div className="ml-auto flex flex-wrap items-center gap-2">
			{selectedCount > 0 && (
				<>
					<span className="text-muted-foreground mr-1 text-sm whitespace-nowrap">
						{selectedCount} selected
					</span>
					{selectionActions}
					{onClearSelection && (
						<Button variant="ghost" size="lg" onClick={onClearSelection}>
							<X />{t("clear")}</Button>
					)}
				</>
			)}
			{primaryAction}
		</div>
	</div>
	)
}

export default Toolbar
