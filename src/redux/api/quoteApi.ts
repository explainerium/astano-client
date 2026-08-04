import type { IMeta } from "@/types"
import type {
	AdminQuoteListParams,
	Quote,
	QuoteReplyPayload,
	QuoteUpdatePayload,
} from "@/types/quote"
import { tagTypes } from "../tag-types"
import { baseApi } from "./baseApi"

export const quoteApi = baseApi.injectEndpoints({
	endpoints: (build) => ({
		adminQuotes: build.query<{ data: Quote[]; meta?: IMeta }, AdminQuoteListParams>({
			query: (params) => ({ url: "/admin/quotes", method: "GET", params }),
			transformResponse: (rows: Quote[], meta?: IMeta) => ({ data: rows, meta }),
			providesTags: [tagTypes.quote],
		}),

		adminQuote: build.query<Quote, string>({
			query: (id) => ({ url: `/admin/quotes/${id}`, method: "GET" }),
			providesTags: [tagTypes.quote],
		}),

		/** Pricing the lines and moving the status. The subtotal is derived server-side. */
		updateQuote: build.mutation<Quote, { id: string; data: QuoteUpdatePayload }>({
			query: ({ id, data }) => ({ url: `/admin/quotes/${id}`, method: "PATCH", data }),
			invalidatesTags: [tagTypes.quote],
		}),

		replyToQuote: build.mutation<unknown, { id: string; data: QuoteReplyPayload }>({
			query: ({ id, data }) => ({ url: `/admin/quotes/${id}/messages`, method: "POST", data }),
			invalidatesTags: [tagTypes.quote],
		}),
	}),
})

export const {
	useAdminQuotesQuery,
	useAdminQuoteQuery,
	useUpdateQuoteMutation,
	useReplyToQuoteMutation,
} = quoteApi
