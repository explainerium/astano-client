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

		/**
		 * Copies an attribute **with all of its values** — the values are the part
		 * worth duplicating. The copy's code gains a "-copy" suffix because codes
		 * are globally unique; value codes are reused, being unique only per
		 * attribute. No body: the server already has the original.
		 */
		duplicateAttribute: build.mutation<AdminAttribute, string>({
			query: (id) => ({ url: `/attributes/${id}/duplicate`, method: "POST" }),
			invalidatesTags: [tagTypes.attribute],
		}),

		deleteAttribute: build.mutation<void, string>({
			query: (id) => ({ url: `/attributes/${id}`, method: "DELETE" }),
			// Products too: an attribute in use is what the API refuses to delete,
			// and removing one changes what a product can be varied by.
			invalidatesTags: [tagTypes.attribute, tagTypes.product],
		}),

		/**
		 * A value typed into a product rather than picked from the list. It joins
		 * the attribute's list; a label the attribute already has comes back as
		 * that value instead of a twin.
		 */
		addAttributeValue: build.mutation<
			{ id: string; code: string; label: string; created: boolean },
			{ attributeId: string; label: string }
		>({
			query: ({ attributeId, label }) => ({
				url: `/attributes/${attributeId}/values`,
				method: "POST",
				data: { label },
			}),
			invalidatesTags: [tagTypes.attribute],
		}),

		/**
		 * An attribute typed into a product by name — the code is made from it.
		 * A name already in use comes back as that attribute instead of a twin.
		 */
		addAttributeByName: build.mutation<{ id: string; created: boolean }, string>({
			query: (name) => ({ url: "/attributes/quick", method: "POST", data: { name } }),
			invalidatesTags: [tagTypes.attribute],
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
	useAddAttributeValueMutation,
	useAddAttributeByNameMutation,
	useCreateAttributeMutation,
	useUpdateAttributeMutation,
	useDuplicateAttributeMutation,
	useDeleteAttributeMutation,
	useDeleteAttributeValueMutation,
} = attributeApi
