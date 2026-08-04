import type { PaymentMethod, PaymentMethodPayload } from "@/types/payment"
import { tagTypes } from "../tag-types"
import { baseApi } from "./baseApi"

export const paymentApi = baseApi.injectEndpoints({
	endpoints: (build) => ({
		paymentMethods: build.query<PaymentMethod[], void>({
			query: () => ({ url: "/payment-methods", method: "GET" }),
			providesTags: [tagTypes.payment],
		}),

		createPaymentMethod: build.mutation<PaymentMethod, PaymentMethodPayload>({
			query: (data) => ({ url: "/payment-methods", method: "POST", data }),
			invalidatesTags: [tagTypes.payment],
		}),

		updatePaymentMethod: build.mutation<
			PaymentMethod,
			{ id: string; data: PaymentMethodPayload }
		>({
			query: ({ id, data }) => ({ url: `/payment-methods/${id}`, method: "PATCH", data }),
			invalidatesTags: [tagTypes.payment],
		}),

		deletePaymentMethod: build.mutation<void, string>({
			query: (id) => ({ url: `/payment-methods/${id}`, method: "DELETE" }),
			invalidatesTags: [tagTypes.payment],
		}),
	}),
})

export const {
	usePaymentMethodsQuery,
	useCreatePaymentMethodMutation,
	useUpdatePaymentMethodMutation,
	useDeletePaymentMethodMutation,
} = paymentApi
