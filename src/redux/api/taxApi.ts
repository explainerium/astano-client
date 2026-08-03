import type { TaxClass, TaxClassPayload, TaxRate, TaxRatePayload } from "@/types/tax"
import { tagTypes } from "../tag-types"
import { baseApi } from "./baseApi"

/**
 * Staff-only throughout — the rate table is never public. Checkout returns the
 * tax computed for one order, not the rates behind it.
 *
 * Rates are their own endpoints rather than part of the class payload, so every
 * mutation here invalidates the `tax` tag and the class list refetches with its
 * rates attached.
 */
export const taxApi = baseApi.injectEndpoints({
	endpoints: (build) => ({
		taxClasses: build.query<TaxClass[], void>({
			query: () => ({ url: "/admin/tax/classes", method: "GET" }),
			providesTags: [tagTypes.tax],
		}),

		createTaxClass: build.mutation<TaxClass, TaxClassPayload>({
			query: (data) => ({ url: "/admin/tax/classes", method: "POST", data }),
			invalidatesTags: [tagTypes.tax],
		}),

		updateTaxClass: build.mutation<TaxClass, { id: string; data: TaxClassPayload }>({
			query: ({ id, data }) => ({ url: `/admin/tax/classes/${id}`, method: "PATCH", data }),
			// Products too: a product points at a class, and the default class is
			// what a product with no class of its own falls back to.
			invalidatesTags: [tagTypes.tax, tagTypes.product],
		}),

		deleteTaxClass: build.mutation<void, string>({
			query: (id) => ({ url: `/admin/tax/classes/${id}`, method: "DELETE" }),
			invalidatesTags: [tagTypes.tax, tagTypes.product],
		}),

		createTaxRate: build.mutation<TaxRate, TaxRatePayload>({
			query: (data) => ({ url: "/admin/tax/rates", method: "POST", data }),
			invalidatesTags: [tagTypes.tax],
		}),

		updateTaxRate: build.mutation<TaxRate, { id: string; data: TaxRatePayload }>({
			query: ({ id, data }) => ({ url: `/admin/tax/rates/${id}`, method: "PATCH", data }),
			invalidatesTags: [tagTypes.tax],
		}),

		deleteTaxRate: build.mutation<void, string>({
			query: (id) => ({ url: `/admin/tax/rates/${id}`, method: "DELETE" }),
			invalidatesTags: [tagTypes.tax],
		}),
	}),
})

export const {
	useTaxClassesQuery,
	useCreateTaxClassMutation,
	useUpdateTaxClassMutation,
	useDeleteTaxClassMutation,
	useCreateTaxRateMutation,
	useUpdateTaxRateMutation,
	useDeleteTaxRateMutation,
} = taxApi
