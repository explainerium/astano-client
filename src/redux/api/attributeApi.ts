import type { AdminAttribute, AttributePayload } from "@/types/attribute"
import { tagTypes } from "../tag-types"
import { baseApi } from "./baseApi"

export const attributeApi = baseApi.injectEndpoints({
	endpoints: (build) => ({
		/** Staff list — every translation attached, for both attributes and values. */
		adminAttributes: build.query<AdminAttribute[], void>({
			query: () => ({ url: "/admin/attributes", method: "GET" }),
			providesTags: [tagTypes.attribute],
		}),

		createAttribute: build.mutation<AdminAttribute, AttributePayload>({
			query: (data) => ({ url: "/attributes", method: "POST", data }),
			invalidatesTags: [tagTypes.attribute],
		}),

		updateAttribute: build.mutation<AdminAttribute, { id: string; data: AttributePayload }>({
			query: ({ id, data }) => ({ url: `/attributes/${id}`, method: "PATCH", data }),
			invalidatesTags: [tagTypes.attribute],
		}),

		deleteAttribute: build.mutation<void, string>({
			query: (id) => ({ url: `/attributes/${id}`, method: "DELETE" }),
			// Products too: an attribute in use is what the API refuses to delete,
			// and removing one changes what a product can be varied by.
			invalidatesTags: [tagTypes.attribute, tagTypes.product],
		}),

		/** Removing a single value, without rewriting the whole attribute. */
		deleteAttributeValue: build.mutation<void, string>({
			query: (id) => ({ url: `/attributes/values/${id}`, method: "DELETE" }),
			invalidatesTags: [tagTypes.attribute, tagTypes.product],
		}),
	}),
})

export const {
	useAdminAttributesQuery,
	useCreateAttributeMutation,
	useUpdateAttributeMutation,
	useDeleteAttributeMutation,
	useDeleteAttributeValueMutation,
} = attributeApi
