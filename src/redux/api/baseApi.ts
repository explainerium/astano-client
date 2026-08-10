import { createApi, retry } from "@reduxjs/toolkit/query/react"
import { axiosBaseQuery } from "@/helpers/axios/axiosBaseQuery"
import { tagTypesList } from "../tag-types"

/**
 * The single API slice. Every feature adds its endpoints with
 * `baseApi.injectEndpoints(...)` rather than creating another createApi — one
 * slice means one cache and one set of tags.
 *
 * Wrapped in `retry` with retries **off** by default: a failed mutation must
 * not be repeated on its own, and most reads are better off reporting an error
 * than hanging. Endpoints that genuinely benefit opt in with
 * `extraOptions: { maxRetries: n }` — the public settings do, because the API
 * sleeps on the free tier and the first request back is what wakes it.
 */
export const baseApi = createApi({
	reducerPath: "api",
	baseQuery: retry(
		axiosBaseQuery({
			baseUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1",
		}),
		{ maxRetries: 0 }
	),
	endpoints: () => ({}),
	tagTypes: tagTypesList,
})
