import type { AnalyseResult, ImportOptions, ImportReport } from "@/types/productIo"
import { tagTypes } from "../tag-types"
import { baseApi } from "./baseApi"

/**
 * Multipart, not JSON — the file goes with the request. The mapping and options
 * ride along as JSON strings because a multipart field is text and there is no
 * other way to carry an object beside a file.
 */
const form = (file: File, fields: Record<string, string> = {}) => {
	const data = new FormData()
	data.append("file", file)
	for (const [key, value] of Object.entries(fields)) data.append(key, value)
	return data
}

export const productIoApi = baseApi.injectEndpoints({
	endpoints: (build) => ({
		/** Headers and a suggested mapping. Reads the file; writes nothing. */
		analyseImport: build.mutation<AnalyseResult, { file: File; delimiter?: string }>({
			query: ({ file, delimiter }) => ({
				url: "/admin/products-io/analyse",
				method: "POST",
				data: form(file, delimiter ? { delimiter } : {}),
			}),
		}),

		runImport: build.mutation<
			ImportReport,
			{
				file: File
				mapping: Record<string, string>
				options: ImportOptions
				delimiter?: string
				dryRun: boolean
			}
		>({
			query: ({ file, mapping, options, delimiter, dryRun }) => ({
				url: "/admin/products-io/import",
				method: "POST",
				data: form(file, {
					mapping: JSON.stringify(mapping),
					options: JSON.stringify(options),
					dryRun: String(dryRun),
					...(delimiter ? { delimiter } : {}),
				}),
				/*
				 * Well past the 60s default.
				 *
				 * A row is several database round trips, and importing the live
				 * catalogue of 55 products took nearly three minutes from a machine
				 * far from the database. With image downloading on it is longer
				 * again. A timeout here does not stop the server — it just loses the
				 * report of work that went ahead anyway.
				 */
				timeout: 15 * 60 * 1000,
			}),
			/*
			 * A dry run changes nothing, so invalidating the catalogue on one would
			 * refetch every list for a preview. Only a real run does.
			 */
			invalidatesTags: (_result, _error, arg) =>
				arg.dryRun ? [] : [tagTypes.product, tagTypes.category, tagTypes.attribute],
		}),
	}),
})

export const { useAnalyseImportMutation, useRunImportMutation } = productIoApi
