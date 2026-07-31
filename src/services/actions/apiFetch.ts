import type { IApiResponse, IGenericErrorResponse } from "@/types"

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1"

/**
 * Status code used when the request never reached the server at all.
 *
 * fetch rejects with a bare TypeError("Failed to fetch") for a dead server, a
 * DNS failure or a blocked CORS preflight — indistinguishable from each other
 * and meaningless to a customer. Callers map this to a sentence a human can
 * act on instead of surfacing the browser's wording.
 */
export const NETWORK_ERROR = 0

/**
 * fetch for the auth endpoints, which cannot go through the axios instance.
 *
 * Those run in the browser on purpose: the API returns the refresh token as an
 * httpOnly cookie, and a cookie only reaches the user's browser if the request
 * came from it. Everything else in the app uses RTK Query + axios.
 */
export const apiFetch = async <T>(
	path: string,
	init: RequestInit = {}
): Promise<IApiResponse<T>> => {
	let response: Response

	try {
		response = await fetch(`${API_URL}${path}`, {
			// Guest cart/wishlist/quote cookies, and the refresh cookie.
			credentials: "include",
			...init,
		})
	} catch {
		const networkError: IGenericErrorResponse = {
			statusCode: NETWORK_ERROR,
			message: "The server could not be reached.",
		}
		throw networkError
	}

	try {
		return (await response.json()) as IApiResponse<T>
	} catch {
		// Reached the server but got something that is not JSON — a proxy error
		// page, or a crash before the handler ran.
		const badResponse: IGenericErrorResponse = {
			statusCode: response.status,
			message: "The server returned an unexpected response.",
		}
		throw badResponse
	}
}

export default apiFetch
