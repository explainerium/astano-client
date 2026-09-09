import type { IMeta } from "@/types"
import type {
	AdminProduct,
	AdminProductListParams,
	ProductPayload,
	TopProductsResponse,
} from "@/types/product"
import { tagTypes } from "../tag-types"
import { baseApi } from "./baseApi"

export const productApi = baseApi.injectEndpoints({
	endpoints: (build) => ({
		adminProducts: build.query<
			{ data: AdminProduct[]; meta?: IMeta },
			AdminProductListParams | void
		>({
			query: (params) => ({ url: "/admin/products", method: "GET", params: params ?? {} }),
			transformResponse: (rows: AdminProduct[], meta?: IMeta) => ({ data: rows, meta }),
			providesTags: [tagTypes.product],
		}),

		adminProduct: build.query<AdminProduct, string>({
			query: (id) => ({ url: `/admin/products/${id}`, method: "GET" }),
			providesTags: [tagTypes.product],
		}),

		/**
		 * The home page's strip, in the order it appears there.
		 *
		 * Its own endpoint rather than `adminProducts({ top: "true" })`: that
		 * answers "which products are ticked" out of the list's own ordering,
		 * while this answers "what the page shows, in what order" — which is the
		 * only question the picker is asking.
		 */
		topProducts: build.query<TopProductsResponse, void>({
			query: () => ({ url: "/admin/products/top", method: "GET" }),
			providesTags: [tagTypes.product],
		}),

		/**
		 * Replaces the strip whole: these products, in this order.
		 *
		 * Not a diff. The screen holds an ordered list somebody dragged, and
		 * sending "add this, move that" would mean rebuilding that order on both
		 * sides and trusting them to agree. Anything ticked and absent from the
		 * array is untucked by the same call.
		 */
		setTopProducts: build.mutation<TopProductsResponse, { productIds: string[] }>({
			query: (data) => ({ url: "/admin/products/top", method: "PUT", data }),
			invalidatesTags: [tagTypes.product],
		}),

		createProduct: build.mutation<AdminProduct, ProductPayload>({
			query: (data) => ({ url: "/admin/products", method: "POST", data }),
			invalidatesTags: [tagTypes.product, tagTypes.category],
		}),

		/**
		 * PATCH is genuinely partial on this endpoint — anything omitted is left
		 * untouched. Send only what changed; sending a key with an empty array
		 * deletes what is there.
		 */
		updateProduct: build.mutation<AdminProduct, { id: string; data: ProductPayload }>({
			query: ({ id, data }) => ({ url: `/admin/products/${id}`, method: "PATCH", data }),
			invalidatesTags: [tagTypes.product, tagTypes.category],
		}),

		/**
		 * Copies a product, everything about it, and returns the copy.
		 *
		 * No body: the server already has the original, and sending it back would
		 * let a stale form overwrite what is being copied. The copy is a **draft**
		 * with no SKU and a fresh slug — see the service for why.
		 */
		duplicateProduct: build.mutation<AdminProduct, string>({
			query: (id) => ({ url: `/admin/products/${id}/duplicate`, method: "POST" }),
			invalidatesTags: [tagTypes.product, tagTypes.category],
		}),

		deleteProduct: build.mutation<void, string>({
			query: (id) => ({ url: `/admin/products/${id}`, method: "DELETE" }),
			invalidatesTags: [tagTypes.product, tagTypes.category],
		}),
	}),
})

export const {
	useAdminProductsQuery,
	useAdminProductQuery,
	useTopProductsQuery,
	useSetTopProductsMutation,
	useCreateProductMutation,
	useUpdateProductMutation,
	useDuplicateProductMutation,
	useDeleteProductMutation,
} = productApi
