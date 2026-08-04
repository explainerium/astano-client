import type {
	ShippingMethod,
	ShippingMethodPayload,
	ShippingZone,
	ShippingZonePayload,
} from "@/types/shipping"
import { tagTypes } from "../tag-types"
import { baseApi } from "./baseApi"

/**
 * Staff-only. Methods are their own endpoints rather than part of the zone
 * payload, so every mutation invalidates the `shipping` tag and the zone list
 * refetches with its methods and bands attached.
 */
export const shippingApi = baseApi.injectEndpoints({
	endpoints: (build) => ({
		shippingZones: build.query<ShippingZone[], void>({
			query: () => ({ url: "/shipping/zones", method: "GET" }),
			providesTags: [tagTypes.shipping],
		}),

		createShippingZone: build.mutation<ShippingZone, ShippingZonePayload>({
			query: (data) => ({ url: "/shipping/zones", method: "POST", data }),
			invalidatesTags: [tagTypes.shipping],
		}),

		updateShippingZone: build.mutation<ShippingZone, { id: string; data: ShippingZonePayload }>({
			query: ({ id, data }) => ({ url: `/shipping/zones/${id}`, method: "PATCH", data }),
			invalidatesTags: [tagTypes.shipping],
		}),

		deleteShippingZone: build.mutation<void, string>({
			query: (id) => ({ url: `/shipping/zones/${id}`, method: "DELETE" }),
			invalidatesTags: [tagTypes.shipping],
		}),

		createShippingMethod: build.mutation<ShippingMethod, ShippingMethodPayload>({
			query: (data) => ({ url: "/shipping/methods", method: "POST", data }),
			invalidatesTags: [tagTypes.shipping],
		}),

		updateShippingMethod: build.mutation<
			ShippingMethod,
			{ id: string; data: ShippingMethodPayload }
		>({
			query: ({ id, data }) => ({ url: `/shipping/methods/${id}`, method: "PATCH", data }),
			invalidatesTags: [tagTypes.shipping],
		}),

		deleteShippingMethod: build.mutation<void, string>({
			query: (id) => ({ url: `/shipping/methods/${id}`, method: "DELETE" }),
			invalidatesTags: [tagTypes.shipping],
		}),
	}),
})

export const {
	useShippingZonesQuery,
	useCreateShippingZoneMutation,
	useUpdateShippingZoneMutation,
	useDeleteShippingZoneMutation,
	useCreateShippingMethodMutation,
	useUpdateShippingMethodMutation,
	useDeleteShippingMethodMutation,
} = shippingApi
