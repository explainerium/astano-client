import type { AuthResult, IApiResponse } from "@/types"
import { storeUserInfo } from "../auth.services"
import apiFetch from "./apiFetch"

/**
 * Runs in the browser, not as a server action — deliberately.
 *
 * The API replies with the refresh token as an httpOnly `astano_refresh`
 * cookie. That cookie only reaches the user's browser if the request came
 * *from* the browser; issued from a server action it would be set on the Next
 * server and thrown away, and the session would silently die after 15 minutes
 * with no way to refresh.
 *
 * Throws IGenericErrorResponse when the server cannot be reached — the caller
 * turns that into a readable message.
 */
export const userLogin = async (
	payload: Record<string, unknown>
): Promise<IApiResponse<AuthResult>> => {
	const result = await apiFetch<AuthResult>("/auth/login", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(payload),
	})

	// document.cookie is set synchronously, so the proxy guard already sees it
	// by the time the caller navigates. Navigation stays the caller's job.
	if (result?.data?.accessToken) {
		storeUserInfo({ accessToken: result.data.accessToken })
	}

	return result
}

export default userLogin
