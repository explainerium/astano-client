import type { IApiResponse } from "@/types"
import apiFetch from "./apiFetch"

/**
 * Dealer registration.
 *
 * Creates the account AND the application in one call, as RESELLER / PENDING.
 * Unlike /auth/register this returns no tokens and sets no refresh cookie —
 * there is deliberately no auto sign-in, because an unapproved account would
 * land in the shop on guest prices (R5b) and look like the application failed.
 */
export const applyAsDealer = async (
	payload: Record<string, unknown>
): Promise<IApiResponse<unknown>> =>
	apiFetch("/b2b/apply", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(payload),
	})

export default applyAsDealer
