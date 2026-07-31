import type { AccessTokenPayload } from "@/types"

/**
 * Reads a JWT payload without verifying it.
 *
 * Written by hand rather than pulling in jwt-decode: this is a base64url decode
 * of one segment, and the frontend has no signing secret so it *cannot* verify
 * anything regardless. The result is only ever used to decide what to render
 * and where to route — the API re-verifies the signature on every request, and
 * that is the check that actually protects anything.
 *
 * Works unchanged in the browser, in Node, and in the Edge runtime the proxy
 * guard runs on: atob and TextDecoder are global in all three.
 */
export const decodeToken = <T = AccessTokenPayload>(token: string): T | null => {
	try {
		const segment = token.split(".")[1]
		if (!segment) return null

		// base64url → base64, then restore the padding base64url strips.
		const base64 = segment.replace(/-/g, "+").replace(/_/g, "/")
		const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=")

		// atob yields a binary string; going via bytes keeps non-ASCII claims
		// (a customer's name, say) from being mangled.
		const bytes = Uint8Array.from(atob(padded), (c) => c.charCodeAt(0))
		return JSON.parse(new TextDecoder().decode(bytes)) as T
	} catch {
		return null
	}
}

/** True when the token is absent, unreadable, or past its `exp`. */
export const isTokenExpired = (payload: Pick<AccessTokenPayload, "exp"> | null): boolean =>
	!payload?.exp || payload.exp * 1000 <= Date.now()

/** Decode and reject anything already expired, in one step. */
export const readAccessToken = (token: string | undefined): AccessTokenPayload | null => {
	if (!token) return null
	const payload = decodeToken(token)
	return payload && !isTokenExpired(payload) ? payload : null
}
