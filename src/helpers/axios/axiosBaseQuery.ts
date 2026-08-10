import type { BaseQueryFn } from "@reduxjs/toolkit/query"
import type { AxiosError, AxiosRequestConfig } from "axios"
import type { IGenericErrorResponse, IMeta } from "@/types"
import { instance as axiosInstance } from "./axiosInstance"

export interface IAxiosBaseQueryArgs {
	url: string
	method?: AxiosRequestConfig["method"]
	data?: AxiosRequestConfig["data"]
	params?: AxiosRequestConfig["params"]
	headers?: AxiosRequestConfig["headers"]
	meta?: IMeta
	contentType?: string
	/**
	 * Overrides the instance's 60s default for the few calls that legitimately
	 * take longer — a catalogue import walks every row and fetches every image,
	 * and a minute is not enough for either.
	 */
	timeout?: number
}

export const axiosBaseQuery =
	({ baseUrl }: { baseUrl: string } = { baseUrl: "" }): BaseQueryFn<
		IAxiosBaseQueryArgs,
		unknown,
		unknown
	> =>
	async ({ url, method, data, params, headers, contentType, timeout }) => {
		try {
			return await axiosInstance({
				url: baseUrl + url,
				method,
				data,
				params,
				...(timeout ? { timeout } : {}),
				headers: {
					...headers,
					// Leave it to the browser for FormData — it has to append the
					// multipart boundary itself, and setting the header by hand
					// strips it. Media uploads pass contentType: undefined.
					...(contentType === undefined && data instanceof FormData
						? {}
						: { "Content-Type": contentType ?? "application/json" }),
				},
			})
		} catch (axiosError) {
			// The response interceptor rejects with a normalized
			// { statusCode, message, errorMessages } object on API errors.
			const normalized = axiosError as Partial<IGenericErrorResponse>
			if (
				normalized &&
				typeof normalized === "object" &&
				("statusCode" in normalized || "errorMessages" in normalized)
			) {
				return { error: { status: normalized.statusCode, data: normalized } }
			}

			const err = axiosError as AxiosError
			return {
				error: {
					status: err.response?.status,
					data: err.response?.data ?? err.message,
				},
			}
		}
	}
