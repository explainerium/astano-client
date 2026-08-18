import type { IApiResponse } from "@/types"
import apiFetch from "./apiFetch"

/**
 * Sets a new password from an emailed token.
 *
 * Does not sign anybody in. The API revokes every refresh token on reset —
 * which is the point of resetting one — so the only honest next step is the
 * sign-in page, and a session issued here would contradict the logout that
 * just happened on every other device.
 */
export const resetPassword = async (
	token: string,
	password: string
): Promise<IApiResponse<unknown>> =>
	apiFetch("/auth/reset-password", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ token, password }),
	})

export default resetPassword
