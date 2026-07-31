import { removeUser } from "../auth.services"

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api/v1"

/**
 * Signs out on both sides.
 *
 * The API call matters: it revokes the refresh-token row so the session cannot
 * be resumed from another device. Clearing the local cookie alone would leave a
 * usable refresh token sitting in the database.
 *
 * A failed API call still clears the local cookie — a user who clicks "sign
 * out" must end up signed out even if the network is down.
 */
export const logoutUser = async (): Promise<void> => {
	try {
		await fetch(`${API_URL}/auth/logout`, {
			method: "POST",
			credentials: "include",
		})
	} finally {
		removeUser()
	}
}

export default logoutUser
