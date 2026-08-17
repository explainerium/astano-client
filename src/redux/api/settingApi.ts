import type { PublicSettings, SettingsPayload, SettingsResponse } from "@/types/setting"
import { tagTypes } from "../tag-types"
import { baseApi } from "./baseApi"

export const settingApi = baseApi.injectEndpoints({
	endpoints: (build) => ({
		settings: build.query<SettingsResponse, void>({
			query: () => ({ url: "/settings", method: "GET" }),
			providesTags: [tagTypes.setting],
		}),

		/**
		 * Currency, units and shop layout, readable without signing in.
		 *
		 * Every price on every page is formatted with these, so the storefront
		 * fetches them once at the root rather than per component.
		 */
		publicSettings: build.query<PublicSettings, void>({
			query: () => ({
				url: "/settings/public",
				method: "GET",
				/*
				 * Short, and retried — the opposite of the 60s default.
				 *
				 * The API sleeps on the free tier and takes the better part of a
				 * minute to wake. One long attempt either hangs the whole page's
				 * prices on it or times out with nothing to show for it; a short
				 * attempt wakes the server and the retry lands on a warm one.
				 */
				timeout: 15_000,
			}),
			extraOptions: { maxRetries: 3 },
			providesTags: [tagTypes.setting],
		}),

		/**
		 * The countries the shop actually delivers to, from the shipping zones.
		 *
		 * Public, and it exists so no country dropdown has to keep its own list.
		 * The one that did drifted from the admin's configuration in both
		 * directions — offering two countries with no delivery method and hiding
		 * five that had one.
		 *
		 * Tagged `shipping`, so an admin editing a zone invalidates it rather than
		 * leaving the storefront on a stale list until the next reload. Same short
		 * timeout and retries as the settings above, for the same sleeping API.
		 */
		deliveryCountries: build.query<{ countries: string[] }, void>({
			query: () => ({ url: "/shipping/countries", method: "GET", timeout: 15_000 }),
			extraOptions: { maxRetries: 3 },
			providesTags: [tagTypes.shipping],
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

export const {
	useSettingsQuery,
	usePublicSettingsQuery,
	useDeliveryCountriesQuery,
	useSaveSettingsMutation,
	useDeleteSettingMutation,
} = settingApi
