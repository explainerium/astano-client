"use client"

import { useEffect } from "react"
import { AUTH_COOKIE } from "@/constants/authKey"
import { refreshSession } from "@/helpers/axios/axiosInstance"
import { getCookie } from "@/utils/cookies"
import { decodeToken } from "@/utils/jwt"

/** Renew this long before the access token runs out. */
const AHEAD_MS = 2 * 60 * 1000

/** How often an open tab looks. Cheap: it reads a cookie and does nothing. */
const CHECK_EVERY_MS = 60 * 1000

/**
 * Keeps a signed-in session signed in while the site is open.
 *
 * The access token lives fifteen minutes and was only ever renewed by a 401 —
 * that is, by an API call failing. A page navigation is not an API call: the
 * proxy reads the cookie, finds it expired and sends the visitor to sign in,
 * with a thirty-day refresh token sitting unused in the browser. So a client
 * who stepped away to prepare pictures came back, clicked a menu entry, and was
 * signed out — fifteen minutes after signing in, however busy they had been.
 *
 * Renewing ahead of time closes that. It checks every minute, and again the
 * moment the tab comes back into view: a background tab's timers are throttled,
 * and coming back is exactly when the next click is about to happen.
 *
 * Renders nothing, and does nothing for a visitor who is not signed in — no
 * access cookie, no refresh.
 */
export const SessionKeeper = () => {
	useEffect(() => {
		const keepFresh = () => {
			const token = getCookie(AUTH_COOKIE)
			if (!token) return

			const exp = decodeToken(token)?.exp
			if (!exp || exp * 1000 - Date.now() > AHEAD_MS) return

			void refreshSession()
		}

		const onVisible = () => {
			if (document.visibilityState === "visible") keepFresh()
		}

		keepFresh()
		const timer = window.setInterval(keepFresh, CHECK_EVERY_MS)
		document.addEventListener("visibilitychange", onVisible)
		window.addEventListener("focus", keepFresh)

		return () => {
			window.clearInterval(timer)
			document.removeEventListener("visibilitychange", onVisible)
			window.removeEventListener("focus", keepFresh)
		}
	}, [])

	return null
}

export default SessionKeeper
