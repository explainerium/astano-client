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
		// The API still answers with a B2C bucket and is left alone — saving is
		// per role, so a bucket this dialog no longer offers is simply never sent.
		setDraft({
			GUEST: toRungs(data.GUEST),
			RESELLER: toRungs(data.RESELLER),
		})
	}

	const rows = draft?.[role] ?? []

	/** Named once — the toast and the Save button have to agree on what they call it. */
	const roleLabel = t(TIER_ROLES.find((item) => item.key === role)?.labelKey ?? "tierRoleRetail")

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

			toast.success(t("ladderSaved", { role: roleLabel }), {
				description: t("ladderAppliesToCategory"),
			})
		} catch (error) {
			toast.error(t("couldNotSaveThisLadder"), {
				description:
					(error as { data?: { message?: string } })?.data?.message ?? t("pleaseTryAgain"),
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
					{t("categoryLadderBlurb")}
				</p>
			</div>

			<Tabs value={role} onValueChange={(value) => setRole(value as TierRole)}>
				<TabsList>
					{TIER_ROLES.map((item) => {
						const count = draft?.[item.key]?.length ?? 0
						return (
							<TabsTrigger key={item.key} value={item.key}>
								{t(item.labelKey)}
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
				baseHint={t("dependsOnOwnPrice")}
				disabled={isSaving}
			/>

			<div className="flex justify-end">
				<Button type="button" onClick={save} disabled={isSaving || !draft}>
					{isSaving && <Loader2 className="animate-spin" />}
					{t("saveLadderFor", { role: roleLabel })}
				</Button>
			</div>
		</div>
	)
}

export default CategoryTiersPanel
