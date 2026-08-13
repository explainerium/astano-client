"use client"

import { useSyncExternalStore } from "react"
import { AUTH_COOKIE } from "@/constants/authKey"
import type { AccessTokenPayload } from "@/types"
import { getCookie } from "@/utils/cookies"
import { readAccessToken } from "@/utils/jwt"

/**
 * Who is signed in, for client components.
 *
 * The cookie is not readable on the server, so this cannot simply be read
 * during render: the server would say "signed out", the client "signed in", and
 * the markup would disagree on hydration. `undefined` therefore means "not
 * determined yet" and is distinct from `null`, which means "signed out" — a
 * header that treats the two the same flashes a Sign-in link at people who are
 * already signed in.
 *
 * `useSyncExternalStore` is the hook for exactly this shape: it renders the
 * server snapshot through hydration and swaps to the client's afterwards. It
 * replaced a setState in an effect, which did the same thing by hand at the
 * cost of a second render and a compiler warning.
 */

/**
 * Cached against the raw cookie.
 *
 * `getSnapshot` may be called on every render, and decoding the token afresh
 * each time would return a new object each time — which React reads as "the
 * store changed", and re-renders again, forever. Keyed on the cookie string so
 * a real change is still picked up.
 */
let cachedRaw: string | undefined
let cachedUser: AccessTokenPayload | null = null

const getSnapshot = (): AccessTokenPayload | null => {
	const raw = getCookie(AUTH_COOKIE)

	if (raw !== cachedRaw) {
		cachedRaw = raw
		cachedUser = readAccessToken(raw)
	}

	return cachedUser
}

/**
 * Nothing pushes changes at us.
 *
 * Signing in and out both leave the page — see hardNavigate — so the cookie
 * never changes under a mounted tree, and there is no event to subscribe to.
 */
const subscribe = () => () => {}

/** What the server renders: nobody, because it cannot see the cookie. */
const getServerSnapshot = (): AccessTokenPayload | null | undefined => undefined

const useUserInfo = () => {
	const userInfo = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

	return {
		userInfo,
		isResolved: userInfo !== undefined,
		isLoggedIn: !!userInfo,
		/** Signed in AND approved. A PENDING Reseller is the former, not the latter. */
		isActive: userInfo?.status === "ACTIVE",
		role: userInfo?.role,
		status: userInfo?.status,
	}
}

export default useUserInfo
