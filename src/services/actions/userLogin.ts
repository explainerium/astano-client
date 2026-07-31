import type { FieldValues } from "react-hook-form"
import type { IApiResponse, AuthResult } from "@/types"
import { storeUserInfo } from "../auth.services"

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1"

/**
 * Runs in the browser, not as a server action — deliberately.
 *
 * The API replies with the refresh token as an httpOnly `astano_refresh`
 * cookie. That cookie only reaches the user's browser if the request came
 * *from* the browser; issued from a server action it would be set on the Next
 * server and thrown away, and the session would silently die after 15 minutes
 * with no way to refresh.
 */
export const userLogin = async (payload: FieldValues): Promise<IApiResponse<AuthResult>> => {
	const res = await fetch(`${API_URL}/auth/login`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(payload),
		credentials: "include",
	})

	const result: IApiResponse<AuthResult> = await res.json()

	// document.cookie is set synchronously, so the proxy guard already sees it
	// by the time the caller navigates. Navigation stays the caller's job.
	if (result?.data?.accessToken) {
		storeUserInfo({ accessToken: result.data.accessToken })
	}

	return result
}

export default userLogin
