import type { AdminCategory, CategoryPayload } from "@/types/catalog"
import { tagTypes } from "../tag-types"
import { baseApi } from "./baseApi"

export const categoryApi = baseApi.injectEndpoints({
	endpoints: (build) => ({
		/** Staff list — flat, hidden included, every translation attached. */
		adminCategories: build.query<AdminCategory[], void>({
			query: () => ({ url: "/admin/categories", method: "GET" }),
			providesTags: [tagTypes.category],
		}),

		createCategory: build.mutation<AdminCategory, CategoryPayload>({
			query: (data) => ({ url: "/categories", method: "POST", data }),
			invalidatesTags: [tagTypes.category],
		}),

		updateCategory: build.mutation<AdminCategory, { id: string; data: CategoryPayload }>({
			query: ({ id, data }) => ({ url: `/categories/${id}`, method: "PATCH", data }),
			invalidatesTags: [tagTypes.category],
		}),

		/**
		 * Copies a category's settings — parent, order, flags, image, and both
		 * languages' text. Not its products and not its subcategories; the copy
		 * starts empty. No body: the server already has the original.
		 */
		duplicateCategory: build.mutation<AdminCategory, string>({
			query: (id) => ({ url: `/categories/${id}/duplicate`, method: "POST" }),
			invalidatesTags: [tagTypes.category],
		}),

		deleteCategory: build.mutation<void, string>({
			query: (id) => ({ url: `/categories/${id}`, method: "DELETE" }),
			// Also invalidates products: deleting a category changes what a
			// product is filed under, and the API refuses if any still point here.
			invalidatesTags: [tagTypes.category, tagTypes.product],
		}),
	}),
})

export const {
	useAdminCategoriesQuery,
	useCreateCategoryMutation,
	useUpdateCategoryMutation,
	useDuplicateCategoryMutation,
	useDeleteCategoryMutation,
} = categoryApi
