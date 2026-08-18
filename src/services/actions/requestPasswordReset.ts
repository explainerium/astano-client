import type { IApiResponse } from "@/types"
import apiFetch from "./apiFetch"

/**
 * Asks for a reset link.
 *
 * The API answers the same way whether or not the address has an account —
 * deliberately, because a different answer turns this form into a way to find
 * out who shops here. So there is nothing to branch on: the screen says "if
 * that address is registered, a link is on its way" either way, and the caller
 * only has to distinguish "asked" from "could not ask".
 *
 * Browser-side like the other auth calls, which keeps one origin and one CORS
 * rule for the whole of this flow.
 */
export const requestPasswordReset = async (email: string): Promise<IApiResponse<unknown>> =>
	apiFetch("/auth/forgot-password", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ email }),
	})

export default requestPasswordReset
