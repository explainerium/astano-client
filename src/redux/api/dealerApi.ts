import type { IMeta } from "@/types"
import type {
	DealerApplication,
	DealerDecisionPayload,
	DealerListParams,
} from "@/types/dealer"
import { tagTypes } from "../tag-types"
import { baseApi } from "./baseApi"

export const dealerApi = baseApi.injectEndpoints({
	endpoints: (build) => ({
		dealerApplications: build.query<
			{ data: DealerApplication[]; meta?: IMeta },
			DealerListParams
		>({
			query: (params) => ({ url: "/admin/b2b", method: "GET", params }),
			transformResponse: (rows: DealerApplication[], meta?: IMeta) => ({ data: rows, meta }),
			providesTags: [tagTypes.b2b],
		}),

		dealerApplication: build.query<DealerApplication, string>({
			query: (id) => ({ url: `/admin/b2b/${id}`, method: "GET" }),
			providesTags: [tagTypes.b2b],
		}),

		/**
		 * Approve or reject. This flips the *user's* status, so it also changes
		 * what they pay — hence the user tag alongside b2b.
		 */
		decideDealer: build.mutation<
			DealerApplication,
			{ id: string; data: DealerDecisionPayload }
		>({
			query: ({ id, data }) => ({ url: `/admin/b2b/${id}/decision`, method: "PATCH", data }),
			invalidatesTags: [tagTypes.b2b, tagTypes.user],
		}),
	}),
})

export const {
	useDealerApplicationsQuery,
	useDealerApplicationQuery,
	useDecideDealerMutation,
} = dealerApi
