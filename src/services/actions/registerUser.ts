import type { AuthResult, IApiResponse } from "@/types"
import { storeUserInfo } from "../auth.services"
import apiFetch from "./apiFetch"

/**
 * Self-registration. The API only ever produces B2C / ACTIVE from this route —
 * RESELLER is unreachable from a request body and requires an admin action, so
 * there is no role field to send. Dealers apply through /b2b instead.
 *
 * Browser-side for the same reason as userLogin: the refresh cookie has to
 * land in the user's browser.
 */
export const registerUser = async (
	payload: Record<string, unknown>
): Promise<IApiResponse<AuthResult>> => {
	const result = await apiFetch<AuthResult>("/auth/register", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(payload),
	})

	if (result?.data?.accessToken) {
		storeUserInfo({ accessToken: result.data.accessToken })
	}

	return result
}

export default registerUser
