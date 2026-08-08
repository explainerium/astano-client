import type { PaymentMethod, PaymentMethodPayload } from "@/types/payment"
import { tagTypes } from "../tag-types"
import { baseApi } from "./baseApi"

/**
 * The offline ways to be paid: bank transfer, invoice, cash on delivery.
 *
 * Read and edit only. The three kinds are a closed set the API materialises on
 * first read, so there is nothing to create — and a method that has taken an
 * order cannot be deleted without orphaning it, which is why switching it off
 * is the only way to retire one.
 */
export const paymentApi = baseApi.injectEndpoints({
	endpoints: (build) => ({
		paymentMethods: build.query<PaymentMethod[], void>({
			query: () => ({ url: "/payment-methods", method: "GET" }),
			providesTags: [tagTypes.payment],
		}),

		updatePaymentMethod: build.mutation<
			PaymentMethod,
			{ id: string; data: PaymentMethodPayload }
		>({
			query: ({ id, data }) => ({ url: `/payment-methods/${id}`, method: "PATCH", data }),
			invalidatesTags: [tagTypes.payment],
		}),
		/**
		 * Only ever clears a leftover from the old builder. The API refuses a
		 * built-in kind and refuses anything an order was paid with.
		 */
		deletePaymentMethod: build.mutation<void, string>({
			query: (id) => ({ url: `/payment-methods/${id}`, method: "DELETE" }),
			invalidatesTags: [tagTypes.payment],
		}),
	}),
})

export const {
	usePaymentMethodsQuery,
	useUpdatePaymentMethodMutation,
	useDeletePaymentMethodMutation,
} = paymentApi
