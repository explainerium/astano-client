import type {
	CleverReachHookResult,
	CleverReachStatus,
	CleverReachSyncResult,
	CleverReachTestResult,
} from "@/types/cleverreach"
import { tagTypes } from "../tag-types"
import { baseApi } from "./baseApi"

/**
 * The CleverReach connection, from the settings screen.
 *
 * Tagged with `setting` as well as `newsletter`: saving the ID, secret or
 * group changes what the status says, and a status that still reads "not set
 * up" after a save reads as the save having failed.
 */
export const cleverReachApi = baseApi.injectEndpoints({
	endpoints: (build) => ({
		cleverReachStatus: build.query<CleverReachStatus, void>({
			query: () => ({ url: "/admin/newsletter/cleverreach", method: "GET" }),
			providesTags: [tagTypes.setting, tagTypes.newsletter],
		}),

		/** Logs in and lists the groups. Saves nothing. */
		testCleverReach: build.mutation<CleverReachTestResult, void>({
			query: () => ({ url: "/admin/newsletter/cleverreach/test", method: "POST", timeout: 45_000 }),
		}),

		/** Registers the unsubscribe webhook. Only works from the live server. */
		connectCleverReachHook: build.mutation<CleverReachHookResult, void>({
			query: () => ({ url: "/admin/newsletter/cleverreach/webhook", method: "POST", timeout: 60_000 }),
			invalidatesTags: [tagTypes.newsletter],
		}),

		/** Sends every change CleverReach has not heard about. A first run can be long. */
		syncCleverReach: build.mutation<CleverReachSyncResult, void>({
			query: () => ({ url: "/admin/newsletter/cleverreach/sync", method: "POST", timeout: 120_000 }),
			invalidatesTags: [tagTypes.newsletter],
		}),
	}),
})

export const {
	useCleverReachStatusQuery,
	useTestCleverReachMutation,
	useSyncCleverReachMutation,
	useConnectCleverReachHookMutation,
} = cleverReachApi
