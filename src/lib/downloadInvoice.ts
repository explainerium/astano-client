import { instance } from "@/helpers/axios/axiosInstance"

/**
 * The axios instance carries no `baseURL` — axiosBaseQuery prepends it per
 * call, because RTK Query owns that wiring. Anything using the instance
 * directly has to say where the API is, or the request goes to the Next.js
 * origin and 404s there.
 */
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1"

/**
 * Opens an order's invoice PDF.
 *
 * Fetched rather than linked to, and that is the whole point. The API guards
 * every route with `Authorization: Bearer …`, and a browser following an
 * `<a href>` sends cookies and nothing else — so a plain link to the PDF
 * arrived unauthenticated and answered 401 at a customer who was very much
 * signed in.
 *
 * Reading the token from the cookie server-side would fix it locally and break
 * it in production: the storefront and the API are on different domains there,
 * so a cookie the frontend set never reaches the API at all. Going through the
 * axios instance means the same header every other request already carries.
 *
 * The blob is opened in a new tab, which is what a customer wants from an
 * invoice — read it, print it, save it — and matches what the link did before.
 */
export const openInvoice = async (path: string, filename: string): Promise<void> => {
	const response = await instance.get(`${API_BASE}${path}`, { responseType: "blob" })

	// The response interceptor passes binary through untouched, so this really
	// is the axios response and `data` really is the PDF.
	const blob = new Blob([response.data as BlobPart], { type: "application/pdf" })
	const url = URL.createObjectURL(blob)

	const opened = window.open(url, "_blank", "noopener")

	if (!opened) {
		// Popup blocked. Fall back to a download rather than failing silently —
		// the customer asked for the invoice either way.
		const link = document.createElement("a")
		link.href = url
		link.download = filename
		link.click()
	}

	/*
	 * Revoked on a timer, not immediately.
	 *
	 * The new tab needs the URL to still resolve when it loads, and there is no
	 * event that reliably fires once it has. A minute is far longer than any
	 * load takes and short enough that the blob does not sit in memory.
	 */
	setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
