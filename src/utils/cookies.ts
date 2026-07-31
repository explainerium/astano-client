/**
 * Browser cookie helpers. Server-side code should use `cookies()` from
 * next/headers instead — these are no-ops outside the browser so that a
 * component rendering on both sides does not crash.
 */

export const getCookie = (name: string): string | undefined => {
	if (typeof document === "undefined") return undefined

	const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
	const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`))
	return match ? decodeURIComponent(match[1]) : undefined
}

export const setCookie = (name: string, value: string, maxAgeSeconds: number): void => {
	if (typeof document === "undefined") return

	const secure = location.protocol === "https:" ? "; Secure" : ""
	document.cookie =
		`${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSeconds}` +
		`; SameSite=Lax${secure}`
}

export const deleteCookie = (name: string): void => {
	if (typeof document === "undefined") return
	document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`
}
