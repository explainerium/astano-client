import { removeUser } from "../auth.services"
import apiFetch from "./apiFetch"

/**
 * Signs out on both sides.
 *
 * The API call matters: it revokes the refresh-token row so the session cannot
 * be resumed from another device. Clearing the local cookie alone would leave a
 * usable refresh token sitting in the database.
 *
 * Failures are swallowed on purpose. A user who clicks "sign out" must end up
 * signed out even if the server is unreachable — leaving them apparently
 * logged in on a shared machine is the worse outcome.
 */
export const logoutUser = async (): Promise<void> => {
	try {
		await apiFetch("/auth/logout", { method: "POST" })
	} catch {
		// Intentionally ignored — see above.
	} finally {
		removeUser()
	}
}

export default logoutUser
