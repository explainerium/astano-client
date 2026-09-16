import type { PriceListAnalysis, PriceListReport } from "@/types/priceList"
import { tagTypes } from "../tag-types"
import { baseApi } from "./baseApi"

/**
 * The ERP's price list: one row per article, list and quantity.
 *
 * Multipart, like the product import — the file goes with the request. Nothing
 * else rides along: this file has a fixed shape, so there is no mapping step to
 * carry.
 */
const form = (file: File, fields: Record<string, string> = {}) => {
	const data = new FormData()
	data.append("file", file)
	for (const [key, value] of Object.entries(fields)) data.append(key, value)
	return data
}

export const priceListApi = baseApi.injectEndpoints({
	endpoints: (build) => ({
		/** What the file holds, and how much of it this shop sells. Writes nothing. */
		analysePriceList: build.mutation<PriceListAnalysis, { file: File; delimiter?: string }>({
			query: ({ file, delimiter }) => ({
				url: "/admin/pricing/price-list/analyse",
				method: "POST",
				data: form(file, delimiter ? { delimiter } : {}),
			}),
		}),

		runPriceListImport: build.mutation<PriceListReport, { file: File; delimiter?: string; dryRun: boolean }>({
			query: ({ file, delimiter, dryRun }) => ({
				url: "/admin/pricing/price-list/import",
				method: "POST",
				data: form(file, { dryRun: String(dryRun), ...(delimiter ? { delimiter } : {}) }),
				// A hundred ladders is a hundred small transactions, and the database
				// is in Paris. Well past the 60s default, as the product import is.
				timeout: 15 * 60 * 1000,
			}),

			// A dry run changes nothing, so only a real run invalidates the catalogue.
			invalidatesTags: (_result, _error, arg) => (arg.dryRun ? [] : [tagTypes.product]),
		}),
	}),
})

export const { useAnalysePriceListMutation, useRunPriceListImportMutation } = priceListApi
