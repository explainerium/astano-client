"use client"

import { useState } from "react"
import { CheckCircle2, Loader2, PlugZap, RefreshCw, Webhook, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
	useCleverReachStatusQuery,
	useConnectCleverReachHookMutation,
	useSyncCleverReachMutation,
	useTestCleverReachMutation,
} from "@/redux/api/cleverReachApi"
import { useSaveSettingsMutation } from "@/redux/api/settingApi"
import type {
	CleverReachHookResult,
	CleverReachSyncResult,
	CleverReachTestResult,
} from "@/types/cleverreach"

const Result = ({ ok, children }: { ok: boolean; children: React.ReactNode }) => (
	<div
		role="status"
		className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${
			ok ? "border-emerald-600/30 bg-emerald-600/10" : "border-destructive/30 bg-destructive/10"
		}`}
	>
		{ok ? (
			<CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
		) : (
			<XCircle className="text-destructive mt-0.5 size-4 shrink-0" />
		)}
		<div className="min-w-0 break-words">{children}</div>
	</div>
)

/**
 * Proves the CleverReach app, picks the group, and sends what is waiting.
 *
 * The test lists the account's groups because that is the next question the
 * form asks — a group id is a number nobody knows by heart, and the only place
 * to look it up is inside CleverReach. Choosing one here saves it directly.
 *
 * Outside the settings form, like the mail and AI tests: a button inside a
 * form is a button that submits it.
 */
export const CleverReachCard = () => {
	const { data: status } = useCleverReachStatusQuery()
	const [test, { isLoading: testing }] = useTestCleverReachMutation()
	const [sync, { isLoading: syncing }] = useSyncCleverReachMutation()
	const [saveSettings, { isLoading: saving }] = useSaveSettingsMutation()
	const [connectHook, { isLoading: hooking }] = useConnectCleverReachHookMutation()
	const [hooked, setHooked] = useState<CleverReachHookResult | null>(null)

	const [tested, setTested] = useState<CleverReachTestResult | null>(null)
	const [synced, setSynced] = useState<CleverReachSyncResult | null>(null)

	const failure = (error: unknown) =>
		(error as { data?: { message?: string } })?.data?.message ?? "The request could not be made."

	const runTest = async () => {
		setTested(null)
		try {
			setTested(await test().unwrap())
		} catch (error) {
			setTested({ ok: false, message: failure(error), groups: [] })
		}
	}

	const runSync = async () => {
		setSynced(null)
		try {
			setSynced(await sync().unwrap())
		} catch (error) {
			setSynced({ sent: 0, message: failure(error) })
		}
	}

	const runConnectHook = async () => {
		setHooked(null)
		try {
			setHooked(await connectHook().unwrap())
		} catch (error) {
			setHooked({ ok: false, message: failure(error) })
		}
	}

	const chooseGroup = async (id: number) => {
		await saveSettings({ settings: [{ key: "cleverreach.groupId", value: String(id) }] })
		// Asked again, so the sentence names the group just chosen.
		await runTest()
	}

	return (
		<section className="bg-card space-y-5 rounded-lg border p-5">
			<div className="space-y-3">
				<div>
					<h3 className="text-sm font-semibold">Test connection</h3>
					<p className="text-muted-foreground mt-1 max-w-prose text-sm">
						Logs in with the saved Client ID and Secret and lists your CleverReach groups. Save
						the ID and secret above first.
					</p>
				</div>

				<Button type="button" onClick={runTest} disabled={testing} aria-busy={testing}>
					{testing ? <Loader2 className="size-4 animate-spin" /> : <PlugZap className="size-4" />}
					{testing ? "Connecting…" : "Test connection"}
				</Button>

				{tested && <Result ok={tested.ok}>{tested.message}</Result>}

				{!!tested?.groups.length && (
					<ul className="divide-y rounded-lg border text-sm">
						{tested.groups.map((group) => {
							const chosen = status?.groupId === String(group.id)
							return (
								<li key={group.id} className="flex items-center gap-3 px-3 py-2">
									<span className="min-w-0 flex-1">
										<span className="font-medium">{group.name}</span>
										<span className="text-muted-foreground ml-2 text-xs tabular-nums">
											ID {group.id}
											{group.receiverCount !== null && ` · ${group.receiverCount} receivers`}
										</span>
									</span>
									{chosen ? (
										<span className="text-xs font-medium text-emerald-600">In use</span>
									) : (
										<Button
											type="button"
											size="sm"
											variant="outline"
											disabled={saving}
											onClick={() => chooseGroup(group.id)}
										>
											Use this group
										</Button>
									)}
								</li>
							)
						})}
					</ul>
				)}
			</div>

			<div className="space-y-3 border-t pt-5">
				<div>
					<h3 className="text-sm font-semibold">Send subscribers</h3>
					<p className="text-muted-foreground mt-1 max-w-prose text-sm">
						Every confirmation and unsubscribe is sent as it happens. This sends whatever is
						still waiting — the first time, everyone who confirmed before the connection existed.
						Unconfirmed addresses are never sent.
					</p>
					{status && (
						<p className="mt-2 text-sm">
							Waiting: <span className="font-semibold tabular-nums">{status.waiting}</span>
							{!status.enabled && (
								<span className="text-muted-foreground"> · switched off above</span>
							)}
						</p>
					)}
				</div>

				<Button
					type="button"
					variant="outline"
					onClick={runSync}
					disabled={syncing || !status?.enabled || !status.waiting}
					aria-busy={syncing}
				>
					{syncing ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
					{syncing ? "Sending…" : "Sync now"}
				</Button>

				{synced && (
					<Result ok={!synced.message}>
						{synced.sent} sent.{synced.message && ` Stopped: ${synced.message}`}
					</Result>
				)}
			</div>

			{/*
			 * The other direction. Every CleverReach mail carries its own
			 * unsubscribe link, and without this the shop never hears that it was
			 * used — the list here goes on counting people who have left.
			 */}
			<div className="space-y-3 border-t pt-5">
				<div>
					<h3 className="text-sm font-semibold">Unsubscribes from CleverReach mails</h3>
					<p className="text-muted-foreground mt-1 max-w-prose text-sm">
						When somebody clicks “unsubscribe” in a CleverReach mail, CleverReach tells the shop and
						they show as unsubscribed here too. Connect once from the live dashboard — CleverReach
						cannot reach a local computer. Connect again after choosing a different group.
					</p>
					{status && (
						<p className="mt-2 text-sm">
							{status.webhook === "connected" && (
								<span className="text-positive font-medium">Connected for the group in use.</span>
							)}
							{status.webhook === "otherGroup" && (
								<span className="text-destructive font-medium">
									Connected for a different group — connect again.
								</span>
							)}
							{status.webhook === "none" && <span className="text-muted-foreground">Not connected.</span>}
						</p>
					)}
				</div>

				<Button
					type="button"
					variant="outline"
					onClick={runConnectHook}
					disabled={hooking || !status?.groupId}
					aria-busy={hooking}
				>
					{hooking ? <Loader2 className="size-4 animate-spin" /> : <Webhook className="size-4" />}
					{hooking ? "Connecting…" : status?.webhook === "none" ? "Connect webhook" : "Connect again"}
				</Button>

				{hooked && <Result ok={hooked.ok}>{hooked.message}</Result>}
			</div>
		</section>
	)
}

export default CleverReachCard
