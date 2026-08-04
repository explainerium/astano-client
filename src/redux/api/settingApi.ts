import type { SettingsPayload, SettingsResponse } from "@/types/setting"
import { tagTypes } from "../tag-types"
import { baseApi } from "./baseApi"

export const settingApi = baseApi.injectEndpoints({
	endpoints: (build) => ({
		settings: build.query<SettingsResponse, void>({
			query: () => ({ url: "/settings", method: "GET" }),
			providesTags: [tagTypes.setting],
		}),

		/** Upsert — only the keys sent are touched, the rest are left alone. */
		saveSettings: build.mutation<unknown, SettingsPayload>({
			query: (data) => ({ url: "/settings", method: "PUT", data }),
			invalidatesTags: [tagTypes.setting],
		}),

		deleteSetting: build.mutation<void, string>({
			query: (key) => ({ url: `/settings/${key}`, method: "DELETE" }),
			invalidatesTags: [tagTypes.setting],
		}),
	}),
})

export const { useSettingsQuery, useSaveSettingsMutation, useDeleteSettingMutation } = settingApi
