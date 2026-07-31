import type { PublicUser } from "@/types"
import { tagTypes } from "../tag-types"
import { baseApi } from "./baseApi"

/**
 * The axios interceptor already unwraps the API envelope to { data, meta },
 * which is exactly the shape RTK Query's baseQuery expects — so endpoints get
 * the payload directly and need no transformResponse.
 */
export const authApi = baseApi.injectEndpoints({
	endpoints: (build) => ({
		me: build.query<PublicUser, void>({
			query: () => ({ url: "/auth/me", method: "GET" }),
			providesTags: [tagTypes.auth],
		}),
	}),
})

export const { useMeQuery } = authApi
