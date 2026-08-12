"use client"

import { useTranslations } from "next-intl"
import { useState } from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import TierLadderEditor, { type LadderRung } from "@/components/pricing/TierLadderEditor"
import { TIER_ROLES, type TierRole } from "@/lib/tiers"
import {
	useCategoryTiersQuery,
	useSaveCategoryTiersMutation,
	type TierRung,
} from "@/redux/api/pricingApi"

/**
 * Quantity ladders inherited by every product in a category.
 *
 * Its own panel, saved on its own button, rather than a section of the category
 * form. Two reasons: the ladders are separate resources with their own endpoint,
 * and a category has to exist before it can have one — so this only appears once
 * the category has an id.
 */
const toRungs = (rows: TierRung[] | undefined): LadderRung[] =>
	(rows ?? []).map((r) => ({ minQuantity: r.minQuantity, type: r.type, amount: r.value }))

export const CategoryTiersPanel = ({ categoryId }: { categoryId: string }) => {
	const t = useTranslations("admin")
	const { data, isFetching } = useCategoryTiersQuery(categoryId)
	const [saveTiers, { isLoading: isSaving }] = useSaveCategoryTiersMutation()

	const [role, setRole] = useState<TierRole>("GUEST")
	const [draft, setDraft] = useState<Record<TierRole, LadderRung[]> | null>(null)

	/**
	 * Seeded from the server once it answers, then owned locally.
	 *
	 * Set during render rather than from an effect — React's own pattern for
	 * deriving state once from a prop. The condition stops being true as soon as
	 * it fires, so a refetch can never overwrite half-typed rows, and the
	 * compiler rejects setState inside an effect anyway.
	 */
	if (data && !draft) {
		setDraft({
			GUEST: toRungs(data.GUEST),
			B2C: toRungs(data.B2C),
			RESELLER: toRungs(data.RESELLER),
		})
	}

	const rows = draft?.[role] ?? []

	const save = async () => {
		if (!draft) return
		try {
			await saveTiers({
				id: categoryId,
				role,
				// Rows with no amount are dropped rather than sent as zero — an
				// abandoned row must not price anything at nothing.
				tiers: draft[role]
					.filter((r) => r.amount.trim() && r.minQuantity > 0)
					.map((r) => ({ minQuantity: r.minQuantity, type: r.type, value: r.amount.trim() })),
			}).unwrap()

			toast.success(`${TIER_ROLES.find((r) => r.key === role)?.label} ladder saved`, {
				description: "Every product in this category follows it from now on.",
			})
		} catch (error) {
			toast.error(t("couldNotSaveThisLadder"), {
				description:
					(error as { data?: { message?: string } })?.data?.message ?? "Please try again.",
			})
		}
	}

	if (isFetching && !draft) {
		return (
			<div className="text-muted-foreground flex items-center gap-2 py-8 text-sm">
				<Loader2 className="size-4 animate-spin" />{t("loadingLadders")}</div>
		)
	}

	return (
		<div className="space-y-4">
			<div>
				<h3 className="text-sm font-medium">{t("categoryQuantityDiscounts")}</h3>
				<p className="text-muted-foreground mt-1 max-w-prose text-xs">
					Applies to every product filed under this category. The quantity counted is
					everything the customer has from the category, not one line — ten each of five
					products reaches a threshold of 50 that no single line reaches.
				</p>
			</div>

			<Tabs value={role} onValueChange={(value) => setRole(value as TierRole)}>
				<TabsList>
					{TIER_ROLES.map((item) => {
						const count = draft?.[item.key]?.length ?? 0
						return (
							<TabsTrigger key={item.key} value={item.key}>
								{item.label}
								{!!count && (
									<span className="bg-primary/12 text-primary inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-semibold tabular-nums">
										{count}
									</span>
								)}
							</TabsTrigger>
						)
					})}
				</TabsList>
			</Tabs>

			{/*
			 * No preview column here, and that is deliberate. A category covers
			 * products at different prices, so there is no single base a percentage
			 * rung could be shown against — a number would have to be invented.
			 */}
			<TierLadderEditor
				value={rows}
				onChange={(next) => draft && setDraft({ ...draft, [role]: next })}
				base={null}
				baseHint="Depends on each product's own price"
				disabled={isSaving}
			/>

			<div className="flex justify-end">
				<Button type="button" onClick={save} disabled={isSaving || !draft}>
					{isSaving && <Loader2 className="animate-spin" />}
					Save {TIER_ROLES.find((r) => r.key === role)?.label.toLowerCase()} ladder
				</Button>
			</div>
		</div>
	)
}

export default CategoryTiersPanel
