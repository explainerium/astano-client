"use client"

import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"
import type { ProductStatus } from "@/types/product"

export interface StatusCounts {
	all?: number
	PUBLISHED?: number
	DRAFT?: number
	ARCHIVED?: number
}

/**
 * WordPress's status links — "All (56) | Published (50) | Drafts (6)".
 *
 * Status lives here rather than as a chip on every row. In a list where most
 * products share the same status, a badge repeated on every line is noise that
 * says nothing; as a filter it answers the question the admin actually has,
 * which is "show me the drafts".
 */
export const StatusLinks = ({
	value,
	onChange,
	counts,
}: {
	value?: ProductStatus
	onChange: (status?: ProductStatus) => void
	counts: StatusCounts
}) => {
	const t = useTranslations("admin")
	const items: { label: string; status?: ProductStatus; count?: number }[] = [
		{ label: t("filterAll"), status: undefined, count: counts.all },
		{ label: t("statusPublished"), status: "PUBLISHED", count: counts.PUBLISHED },
		{ label: t("statusDrafts"), status: "DRAFT", count: counts.DRAFT },
		{ label: t("statusArchived"), status: "ARCHIVED", count: counts.ARCHIVED },
	]

	return (
		<nav className="flex flex-wrap items-center gap-x-1 text-sm">
			{items.map((item, index) => {
				const active = value === item.status
				return (
					<span key={item.label} className="flex items-center">
						{index > 0 && <span className="text-muted-foreground/40 mr-1">|</span>}
						<button
							type="button"
							onClick={() => onChange(item.status)}
							aria-current={active ? "page" : undefined}
							className={cn(
								"rounded px-1 py-0.5",
								active
									? "text-foreground font-semibold"
									: "text-primary hover:underline"
							)}
						>
							{item.label}
							{item.count !== undefined && (
								<span className="text-muted-foreground ml-1 tabular-nums">
									({item.count})
								</span>
							)}
						</button>
					</span>
				)
			})}
		</nav>
	)
}

export default StatusLinks
