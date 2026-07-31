import type { FieldValues } from "react-hook-form"
import type { IApiResponse, AuthResult } from "@/types"
import { storeUserInfo } from "../auth.services"

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1"

/**
 * Self-registration. The API only ever produces B2C / ACTIVE from this route —
 * RESELLER is unreachable from a request body and requires an admin action, so
 * there is no role field to send. Dealers apply through /b2b instead.
 *
 * Browser-side for the same reason as userLogin: the refresh cookie has to
 * land in the user's browser.
 */
export const registerUser = async (
	payload: FieldValues
): Promise<IApiResponse<AuthResult>> => {
	const res = await fetch(`${API_URL}/auth/register`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(payload),
		credentials: "include",
	})

	const result: IApiResponse<AuthResult> = await res.json()

	if (result?.data?.accessToken) {
		storeUserInfo({ accessToken: result.data.accessToken })
	}

	return result
}

export default registerUser
