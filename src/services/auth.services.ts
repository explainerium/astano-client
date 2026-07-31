import { AUTH_COOKIE, AUTH_COOKIE_MAX_AGE } from "@/constants/authKey"
import type { AccessTokenPayload } from "@/types"
import { deleteCookie, getCookie, setCookie } from "@/utils/cookies"
import { readAccessToken } from "@/utils/jwt"

/**
 * Browser-side view of who is signed in.
 *
 * Everything here reads the access-token cookie. It is advisory only — it
 * decides what to render, never what is permitted. The API re-verifies the
 * token on every request and is the sole authority on access.
 */

export const storeUserInfo = ({ accessToken }: { accessToken: string }): void => {
	setCookie(AUTH_COOKIE, accessToken, AUTH_COOKIE_MAX_AGE)
}

/**
 * Returns the token claims, or null if absent/expired.
 *
 * `role` is returned exactly as the API spells it — GUEST, B2C, RESELLER,
 * SHOP_MANAGER, ADMIN. It is not lowercased: one spelling everywhere means a
 * guard can never miss a match because two sides disagreed about case.
 */
export const getUserInfo = (): AccessTokenPayload | null =>
	readAccessToken(getCookie(AUTH_COOKIE))

export const isLoggedIn = (): boolean => getUserInfo() !== null

/**
 * True only for an ACTIVE account. A PENDING Reseller is signed in and can see
 * their application status, but reaches no protected route — the API 403s them
 * (R5b), so the UI must not offer what will be refused.
 */
export const isActive = (): boolean => getUserInfo()?.status === "ACTIVE"

export const removeUser = (): void => {
	deleteCookie(AUTH_COOKIE)
}
