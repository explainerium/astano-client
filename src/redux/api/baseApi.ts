import { createApi } from "@reduxjs/toolkit/query/react"
import { axiosBaseQuery } from "@/helpers/axios/axiosBaseQuery"
import { tagTypesList } from "../tag-types"

/**
 * The single API slice. Every feature adds its endpoints with
 * `baseApi.injectEndpoints(...)` rather than creating another createApi — one
 * slice means one cache and one set of tags.
 */
export const baseApi = createApi({
	reducerPath: "api",
	baseQuery: axiosBaseQuery({
		baseUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1",
	}),
	endpoints: () => ({}),
	tagTypes: tagTypesList,
})
