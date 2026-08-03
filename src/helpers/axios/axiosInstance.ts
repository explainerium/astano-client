import axios, {
	type AxiosError,
	type AxiosResponse,
	type InternalAxiosRequestConfig,
} from "axios"
import { AUTH_COOKIE, AUTH_COOKIE_MAX_AGE } from "@/constants/authKey"
import type { IGenericErrorResponse, ResponseSuccessType } from "@/types"
import { deleteCookie, getCookie, setCookie } from "@/utils/cookies"

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1"

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean }

const instance = axios.create({
	timeout: 60_000,
	/**
	 * Required on every request, not just the refresh call.
	 *
	 * Guest carts, wishlists and quote baskets are tracked by httpOnly cookies
	 * the API sets (astano_cart, astano_wishlist, astano_quote). Without
	 * credentials a guest would be handed a brand-new empty cart on every
	 * request and the basket would appear to lose its contents at random.
	 */
	withCredentials: true,
	headers: { Accept: "application/json" },
})

instance.interceptors.request.use((config) => {
	const token = getCookie(AUTH_COOKIE)
	// The API checks for the "Bearer " prefix explicitly and 401s without it.
	if (token) config.headers.Authorization = `Bearer ${token}`

	// resolveLocale on the API accepts X-Locale. <html lang> is rendered from
	// the active locale, so it is always the correct answer and needs no extra
	// plumbing to reach here.
	if (typeof document !== "undefined" && document.documentElement.lang) {
		config.headers["X-Locale"] = document.documentElement.lang
	}

	return config
})

/**
 * One refresh at a time. Without this, a page that fires six requests on mount
 * would send six refreshes when the token expires — and since the API rotates
 * refresh tokens, five of them would fail and log the user out.
 */
let refreshInFlight: Promise<string | null> | null = null

const refreshAccessToken = async (): Promise<string | null> => {
	try {
		// Bare axios, not `instance` — going through the interceptors would
		// recurse straight back into here.
		const { data } = await axios.post(
			`${API_URL}/auth/refresh`,
			{},
			{ withCredentials: true }
		)
		const token: string | undefined = data?.data?.accessToken
		if (!token) return null

		setCookie(AUTH_COOKIE, token, AUTH_COOKIE_MAX_AGE)
		return token
	} catch {
		// The refresh token is spent or revoked. Clear the stale access cookie
		// so the proxy guard sends the user to sign in rather than looping.
		deleteCookie(AUTH_COOKIE)
		return null
	}
}

instance.interceptors.response.use(
	(response) => {
		// Deliberately reshaped: callers get { data, meta } and never have to
		// reach through the API envelope themselves.
		//
		// `?? null` matters: a DELETE answers with an envelope carrying no `data`
		// key, which would make this `undefined` — and RTK Query treats a base
		// query result whose `data` is undefined as neither success nor failure,
		// logging "returned an object containing neither a valid error and
		// result" on every delete in the app. Null is a value; undefined is not.
		const unwrapped: ResponseSuccessType = {
			data: response.data?.data ?? null,
			meta: response.data?.meta,
		}
		return unwrapped as unknown as AxiosResponse
	},
	async (error: AxiosError<{ statusCode?: number; message?: string }>) => {
		const config = error.config as RetriableConfig | undefined

		/**
		 * 401, not 500.
		 *
		 * The API returns 401 for a missing, invalid or expired access token
		 * (app/middlewares/auth.ts). It returns 403 for an account that is
		 * authenticated but not ACTIVE — that one must NOT trigger a refresh,
		 * because a new token would carry the same non-ACTIVE status and the
		 * retry would fail identically.
		 */
		const shouldRefresh =
			error.response?.status === 401 &&
			config !== undefined &&
			!config._retried &&
			!config.url?.includes("/auth/refresh")

		if (shouldRefresh) {
			config._retried = true

			refreshInFlight ??= refreshAccessToken().finally(() => {
				refreshInFlight = null
			})
			const token = await refreshInFlight

			if (token) {
				config.headers.Authorization = `Bearer ${token}`
				return instance(config)
			}
		}

		// Normalized so RTK Query sees a consistent error shape: queries set
		// isError, and .unwrap() on mutations throws so try/catch + toasts fire.
		// The API localizes its own messages, so `message` is already in the
		// visitor's language; the fallback only appears when there was no
		// response at all (the network dropped).
		const normalized: IGenericErrorResponse = {
			statusCode: error.response?.data?.statusCode ?? error.response?.status ?? 500,
			message: error.response?.data?.message ?? "Something went wrong. Please try again.",
			errorMessages: error.response?.data?.message,
		}
		return Promise.reject(normalized)
	}
)

export { instance }
