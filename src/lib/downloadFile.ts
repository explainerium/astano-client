import { instance } from "@/helpers/axios/axiosInstance"

/**
 * The axios instance carries no `baseURL` — axiosBaseQuery prepends it per
 * call, because RTK Query owns that wiring. Anything using the instance
 * directly has to say where the API is, or the request goes to the Next.js
 * origin and 404s there.
 */
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1"

/**
 * Saves a file from an authenticated endpoint.
 *
 * Fetched rather than linked to, for the reason `openInvoice` documents: the
 * API guards every route with `Authorization: Bearer …`, and a browser
 * following an `<a href>` sends cookies and nothing else. A plain link to the
 * export answers 401 at an admin who is very much signed in.
 */
export const downloadFile = async (
	path: string,
	filename: string,
	mimeType = "text/csv;charset=utf-8"
): Promise<void> => {
	const response = await instance.get(`${API_BASE}${path}`, { responseType: "blob" })

	// The response interceptor passes binary through untouched, so `data` really
	// is the file rather than an unwrapped JSON envelope.
	const blob = new Blob([response.data as BlobPart], { type: mimeType })
	const url = URL.createObjectURL(blob)

	const link = document.createElement("a")
	link.href = url
	link.download = filename
	link.click()

	setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
