import type { IMeta } from "@/types"
import type {
	AdminOrderListParams,
	Order,
	OrderNote,
	OrderNotePayload,
	OrderStatusPayload,
} from "@/types/order"
import { tagTypes } from "../tag-types"
import { baseApi } from "./baseApi"

export const orderApi = baseApi.injectEndpoints({
	endpoints: (build) => ({
		adminOrders: build.query<{ data: Order[]; meta?: IMeta }, AdminOrderListParams>({
			query: (params) => ({ url: "/admin/orders", method: "GET", params }),
			transformResponse: (rows: Order[], meta?: IMeta) => ({ data: rows, meta }),
			providesTags: [tagTypes.order],
		}),

		adminOrder: build.query<Order, string>({
			query: (id) => ({ url: `/admin/orders/${id}`, method: "GET" }),
			providesTags: [tagTypes.order],
		}),

		/**
		 * Stock, refunds and emails are the server's business — the admin says
		 * what the order *is* now, not what should happen as a result.
		 */
		updateOrderStatus: build.mutation<Order, { id: string; data: OrderStatusPayload }>({
			query: ({ id, data }) => ({ url: `/admin/orders/${id}/status`, method: "PATCH", data }),
			invalidatesTags: [tagTypes.order],
		}),

		orderNotes: build.query<OrderNote[], string>({
			query: (id) => ({ url: `/admin/orders/${id}/notes`, method: "GET" }),
			providesTags: [tagTypes.order],
		}),

		/** A visible note emails the customer — the server decides that, not this. */
		addOrderNote: build.mutation<OrderNote, { id: string; data: OrderNotePayload }>({
			query: ({ id, data }) => ({ url: `/admin/orders/${id}/notes`, method: "POST", data }),
			invalidatesTags: [tagTypes.order],
		}),
	}),
})

export const {
	useAdminOrdersQuery,
	useAdminOrderQuery,
	useUpdateOrderStatusMutation,
	useOrderNotesQuery,
	useAddOrderNoteMutation,
} = orderApi
