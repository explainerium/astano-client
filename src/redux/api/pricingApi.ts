import { tagTypes } from "../tag-types"
import { baseApi } from "./baseApi"
import type { PriceRole, TierType } from "@/types/product"

/**
 * The two ladders that live outside a product, and the setting that decides
 * which ladder wins.
 *
 * A product's own ladder is saved as part of the product, so it is not here —
 * these are the sources the product editor cannot reach.
 */

export interface TierRung {
	id?: string
	minQuantity: number
	type: TierType
	value: string
}

/** A category's ladders, grouped by the audience each applies to. */
export type CategoryTiers = Record<PriceRole, TierRung[]>

export interface CustomerTierGroup {
	/** Null means the ladder covers everything this customer buys. */
	productId: string | null
	productName: string | null
	note: string | null
	tiers: TierRung[]
}

export interface TierPriority {
	order: ("customer" | "catalogue" | "category")[]
	isDefault: boolean
	sources: { value: string; label: string; description: string }[]
}

export const pricingApi = baseApi.injectEndpoints({
	endpoints: (build) => ({
		categoryTiers: build.query<CategoryTiers, string>({
			query: (id) => ({ url: `/admin/pricing/categories/${id}/tiers`, method: "GET" }),
			providesTags: [tagTypes.category],
		}),

		/**
		 * Replaces one role's ladder outright — the body is the whole ladder, not a
		 * patch. Invalidates products as well as categories: a category ladder
		 * changes what every product inside it costs.
		 */
		saveCategoryTiers: build.mutation<
			CategoryTiers,
			{ id: string; role: PriceRole; tiers: Omit<TierRung, "id">[] }
		>({
			query: ({ id, ...data }) => ({
				url: `/admin/pricing/categories/${id}/tiers`,
				method: "PUT",
				data,
			}),
			invalidatesTags: [tagTypes.category, tagTypes.product],
		}),

		customerTiers: build.query<CustomerTierGroup[], string>({
			query: (id) => ({ url: `/admin/pricing/customers/${id}/tiers`, method: "GET" }),
			providesTags: [tagTypes.user],
		}),

		saveCustomerTiers: build.mutation<
			CustomerTierGroup[],
			{ id: string; productId: string | null; note?: string | null; tiers: Omit<TierRung, "id">[] }
		>({
			query: ({ id, ...data }) => ({
				url: `/admin/pricing/customers/${id}/tiers`,
				method: "PUT",
				data,
			}),
			invalidatesTags: [tagTypes.user, tagTypes.product],
		}),

		tierPriority: build.query<TierPriority, void>({
			query: () => ({ url: "/admin/pricing/tier-priority", method: "GET" }),
			providesTags: [tagTypes.setting],
		}),

		saveTierPriority: build.mutation<TierPriority, TierPriority["order"]>({
			query: (order) => ({ url: "/admin/pricing/tier-priority", method: "PUT", data: { order } }),
			// Every price in the shop depends on this order.
			invalidatesTags: [tagTypes.setting, tagTypes.product, tagTypes.category],
		}),
	}),
})

export const {
	useCategoryTiersQuery,
	useSaveCategoryTiersMutation,
	useCustomerTiersQuery,
	useSaveCustomerTiersMutation,
	useTierPriorityQuery,
	useSaveTierPriorityMutation,
} = pricingApi
