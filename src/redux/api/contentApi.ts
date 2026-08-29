import type {
	ContentPagesPayload,
	ContentPagesResponse,
	ContentPayload,
	ContentResponse,
} from "@/types/content"
import { tagTypes } from "../tag-types"
import { baseApi } from "./baseApi"

export const contentApi = baseApi.injectEndpoints({
	endpoints: (build) => ({
		/**
		 * Both languages, plus the registry the screen draws itself from.
		 *
		 * ADMIN only at the API. A SHOP_MANAGER who reaches this URL gets a 401,
		 * which is the guard that actually holds — the hidden menu item and the
		 * proxy rule above it are courtesies.
		 */
		content: build.query<ContentResponse, void>({
			query: () => ({ url: "/content", method: "GET" }),
			providesTags: [tagTypes.content],
		}),

		/**
		 * Upsert. Only the keys sent are touched.
		 *
		 * Nothing here clears the storefront's cache — that is Next's own, and
		 * the API cannot reach it. The screen calls /api/content/revalidate after
		 * a successful save, which is why an edit shows up on the next request
		 * rather than at the end of the revalidate window.
		 */
		saveContent: build.mutation<unknown, ContentPayload>({
			query: (data) => ({ url: "/content", method: "PUT", data }),
			invalidatesTags: [tagTypes.content],
		}),

		/**
		 * The three legal documents, both languages.
		 *
		 * A query of its own rather than part of `content`: these are measured in
		 * tens of thousands of words, and the field screen has no use for them.
		 */
		contentPages: build.query<ContentPagesResponse, void>({
			query: () => ({ url: "/content/pages", method: "GET" }),
			providesTags: [tagTypes.content],
		}),

		saveContentPages: build.mutation<unknown, ContentPagesPayload>({
			query: (data) => ({ url: "/content/pages", method: "PUT", data }),
			invalidatesTags: [tagTypes.content],
		}),
	}),
})

export const {
	useContentQuery,
	useSaveContentMutation,
	useContentPagesQuery,
	useSaveContentPagesMutation,
} = contentApi
