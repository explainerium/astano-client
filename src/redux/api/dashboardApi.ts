import { tagTypes } from "../tag-types"
import { baseApi } from "./baseApi"

/**
 * The admin landing screen, in one request.
 *
 * Every figure here is computed by the API — nothing on this screen is derived
 * in the browser. Revenue in particular: the rule for which orders count as
 * money belongs next to the orders, not next to the chart that draws them.
 */

/** Percentage change against the previous window; null when there was nothing to compare. */
export interface StatDelta {
	deltaPercent: number | null
}

export interface DashboardSummary {
	period: { days: number; from: string; to: string }
	stats: {
		/** Money arrives as a fixed-point string, never a float. */
		revenue: { value: string; previous: string } & StatDelta
		orders: { value: number; previous: number } & StatDelta
		quotes: { value: number; previous: number } & StatDelta
		products: { value: number; published: number }
	}
	/** One entry per day in the window, empty days included. */
	series: { date: string; revenue: string; orders: number; quotes: number }[]
	topProducts: { id: string; name: string; revenue: string; quantity: number }[]
	topCategories: { id: string; name: string; revenue: string; quantity: number }[]
	/** Every status, cancellations included — that is the point of this one. */
	ordersByStatus: { status: string; count: number }[]
	/** GUEST when the order had no account, otherwise the buyer's current role. */
	revenueByCustomerType: { type: string; revenue: string; orders: number }[]
	recentOrders: {
		id: string
		number: number
		status: string
		paymentStatus: string
		grandTotal: string
		currency: string
		placedAt: string
		customer: string | null
	}[]
	pendingDealers: {
		id: string
		userId: string
		companyName: string
		city: string
		countryCode: string
		createdAt: string
		contact: string
		email: string
	}[]
	pendingDealerCount: number
}

export const dashboardApi = baseApi.injectEndpoints({
	endpoints: (build) => ({
		dashboardSummary: build.query<DashboardSummary, { days?: number } | void>({
			query: (args) => ({
				url: "/admin/dashboard/summary",
				method: "GET",
				params: args?.days ? { days: args.days } : undefined,
			}),
			/**
			 * Tagged with everything it counts, so approving a dealer or cancelling
			 * an order refreshes the figures instead of leaving a stale number on
			 * screen until someone reloads.
			 */
			providesTags: [tagTypes.order, tagTypes.quote, tagTypes.product, tagTypes.b2b],
		}),
	}),
})

export const { useDashboardSummaryQuery } = dashboardApi
