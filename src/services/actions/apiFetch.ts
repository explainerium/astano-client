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
 * How long one attempt may take, and how many are made.
 *
 * `fetch` has no timeout of its own. Left alone it waits as long as the browser
 * is willing to — which on a sleeping API is minutes, with nothing on screen
 * but a spinner. That is the whole of the "the login button does nothing" bug:
 * the request never failed, so no error was ever shown and no redirect ever
 * ran. The axios instance every other call goes through has always had a
 * 60-second limit; these four endpoints were the ones without.
 *
 * Short attempts rather than one long one, matching how the public settings are
 * fetched. The API sleeps after fifteen idle minutes on the free tier and takes
 * the better part of a minute to wake: the first attempt is what wakes it, and
 * the retry lands on a warm server. One 60-second attempt would instead sit
 * there for a minute and then fail on the very request that did the waking.
 */
const ATTEMPT_TIMEOUT_MS = 20_000
const ATTEMPTS = 3

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
	let response: Response | null = null

	for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
		try {
			response = await fetch(`${API_URL}${path}`, {
				// Guest cart/wishlist/quote cookies, and the refresh cookie.
				credentials: "include",
				signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
				...init,
			})
			break
		} catch {
			/*
			 * Retried because the likely cause is a server that was asleep, not a
			 * request that is wrong. Sign-in is safe to repeat: a second attempt
			 * that reaches a server which already answered simply issues another
			 * session, and the first was never delivered to anyone.
			 *
			 * The last failure is the one that surfaces, as a network error rather
			 * than the browser's own wording — "Failed to fetch" means nothing to a
			 * customer, and a timeout, a DNS failure and a blocked preflight are
			 * indistinguishable here anyway.
			 */
			if (attempt === ATTEMPTS) {
				const networkError: IGenericErrorResponse = {
					statusCode: NETWORK_ERROR,
					message: "The server could not be reached.",
				}
				throw networkError
			}
		}
	}

	if (!response) {
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
