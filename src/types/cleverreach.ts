/** Mirrors the backend's CleverReach endpoints under /admin/newsletter. */

export interface CleverReachStatus {
	enabled: boolean
	/** Client ID and secret are both stored. Whether they work is what the test is for. */
	configured: boolean
	groupId: string
	/** Confirmed or unsubscribed addresses CleverReach has not heard about yet. */
	waiting: number
	/**
	 * Whether CleverReach tells the shop when somebody unsubscribes from one of
	 * its mails. `otherGroup`: connected, but for a group no longer in use.
	 */
	webhook: "none" | "connected" | "otherGroup"
}

export interface CleverReachHookResult {
	ok: boolean
	message: string
}

export interface CleverReachGroup {
	id: number
	name: string
	receiverCount: number | null
}

/** `ok: false` arrives on a 200, with CleverReach's own sentence in `message`. */
export interface CleverReachTestResult {
	ok: boolean
	message: string
	groups: CleverReachGroup[]
}

export interface CleverReachSyncResult {
	sent: number
	/** Why it stopped, when it did. */
	message: string | null
}
