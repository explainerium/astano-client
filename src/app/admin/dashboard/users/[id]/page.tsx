"use client"

import { useTranslations } from "next-intl"
import { useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Check, Loader2, RotateCcw, Trash2, X } from "lucide-react"
import { toast } from "sonner"
import Panel from "@/components/dashboard/shell/Panel"
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"
import {
	useApproveUserMutation,
	useDecideDealerMutation,
	useDeleteUserMutation,
	usePurgeUserMutation,
	useRejectUserMutation,
	useRestoreUserMutation,
	useSetUserRoleMutation,
	useSetUserStatusMutation,
	useUserQuery,
} from "@/redux/api/userApi"
import useUserInfo from "@/hooks/useUserInfo"
import { cn } from "@/lib/utils"
import type { AssignableRole, AssignableStatus } from "@/types/user"
import {
	ASSIGNABLE_ROLES,
	formatDate,
	formatDateTime,
	nameOf,
	ROLE_LABEL,
	STAFF_ROLES,
	STATUS_ACTIONS,
	STATUS_CHIP,
} from "../_components/userLabels"

const regionNames = new Intl.DisplayNames(["en"], { type: "region" })

const countryName = (code: string | null) => {
	if (!code) return "—"
	try {
		return regionNames.of(code) ?? code
	} catch {
		return code
	}
}

const Row = ({ label, value }: { label: string; value: React.ReactNode }) => (
	<div className="flex justify-between gap-4 border-b py-2 last:border-0">
		<dt className="text-muted-foreground text-sm">{label}</dt>
		<dd className="max-w-[60%] text-right text-sm break-words">{value || "—"}</dd>
	</div>
)

/**
 * One account, everything about it.
 *
 * This page is why the dealer queue is gone: the application, the role, the
 * account state and the decision are all about the same person, and they were
 * spread over two screens that each showed half the picture.
 */
export default function UserDetailPage() {
	const t = useTranslations("admin")
	const { id } = useParams<{ id: string }>()
	const router = useRouter()
	const { userInfo } = useUserInfo()

	const { data: user, isLoading, isError, error } = useUserQuery(id)

	const [setRole] = useSetUserRoleMutation()
	const [setStatus] = useSetUserStatusMutation()
	const [approve] = useApproveUserMutation()
	const [reject] = useRejectUserMutation()
	const [decide] = useDecideDealerMutation()
	const [remove] = useDeleteUserMutation()
	const [restore] = useRestoreUserMutation()
	const [purge] = usePurgeUserMutation()

	const [busy, setBusy] = useState(false)
	const [confirmPurge, setConfirmPurge] = useState(false)

	const run = async (action: () =>Promise<unknown>, success: string) => {
		setBusy(true)
		try {
			await action()
			toast.success(success)
		} catch (err) {
			const message = (err as { data?: { message?: string } })?.data?.message
			toast.error(message ?? "Could not update the account.")
		}
		setBusy(false)
	}

	if (isLoading) {
		return (
			<div className="bg-card text-muted-foreground flex items-center justify-center gap-2 rounded-lg border p-16 text-sm">
				<Loader2 className="size-4 animate-spin" />{t("loadingAccount")}</div>
		)
	}

	if (isError || !user) {
		return (
			<div className="text-destructive bg-card rounded-lg border border-dashed p-16 text-center text-sm">
				{(error as { data?: { message?: string } })?.data?.message ?? "Could not load this account."}
			</div>
		)
	}

	const name = nameOf(user)
	const chip = STATUS_CHIP[user.status]
	const isSelf = user.id === userInfo?.sub
	const isAdmin = userInfo?.role === "ADMIN"
	const application = user.application

	/**
	 * Who may act on this row.
	 *
	 * Mirrors the server's guards rather than trusting the UI: the API refuses all
	 * of this independently. Reflecting it here is about not offering a button
	 * whose only outcome is an error.
	 */
	const staffTarget = STAFF_ROLES.includes(user.role)
	const canModerate = !isSelf && !!user.deletedAt === false && (isAdmin || !staffTarget)
	const canSetRole = isAdmin && !isSelf && !user.deletedAt

	return (
		<div className="space-y-5">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div className="flex items-start gap-3">
					<Button variant="ghost" size="icon" onClick={() => router.back()} aria-label={t("back")}>
						<ArrowLeft />
					</Button>
					<div>
						<h1 className="font-heading text-xl font-semibold tracking-tight">{name}</h1>
						<p className="text-muted-foreground text-sm">
							{user.email}
							{isSelf && " · this is you"}
						</p>
					</div>
				</div>

				<div className="flex items-center gap-2">
					{user.deletedAt && (
						<Badge variant="outline" className="border-transparent bg-negative-soft text-negative">
							Deleted {formatDate(user.deletedAt)}
						</Badge>
					)}
					<Badge variant="outline" className={chip.className}>
						{chip.label}
					</Badge>
					<Badge variant="outline">{ROLE_LABEL[user.role]}</Badge>
				</div>
			</div>

			{/* A suspended account is the one state whose meaning is not obvious from
			    its name, so it says what it means where the decision is visible. */}
			{user.status === "SUSPENDED" && (
				<div className="bg-accent-soft text-accent-foreground rounded-lg px-4 py-3 text-sm">
					Suspended. They can still sign in, read their history and correct their details, but
					cannot order or request a quote — and as a dealer they see guest prices.
				</div>
			)}

			{isSelf && (
				<div className="bg-muted text-muted-foreground rounded-lg px-4 py-3 text-sm">
					This is your own account. Roles and account state can only be changed by another
					administrator — nobody moderates themselves.
				</div>
			)}

			<div className="grid gap-5 xl:grid-cols-3">
				<Panel title={t("account")} className="xl:col-span-2">
					<dl>
						<Row label={t("email")} value={user.email} />
						<Row label={t("name")} value={[user.salutation, user.firstName, user.lastName].filter(Boolean).join(" ")} />
						<Row label={t("company")} value={user.company} />
						<Row label={t("phone")} value={user.phone} />
						<Row
							label="VAT number"
							value={
								user.vatNumber ? (
									<span className="flex items-center justify-end gap-2">
										<span className="font-mono text-xs">{user.vatNumber}</span>
										<Badge
											variant="outline"
											className={cn(
												"border-transparent",
												user.vatValidated
													? "bg-positive-soft text-positive"
													: "bg-muted text-muted-foreground"
											)}
										>
											{user.vatValidated ? "VIES validated" : "Unvalidated"}
										</Badge>
									</span>
								) : null
							}
						/>
						<Row label={t("founded")} value={formatDate(user.foundingDate)} />
						<Row label="PSI member" value={user.psiMember ? "Yes" : "No"} />
						<Row label={t("language")} value={user.locale === "de" ? "Deutsch" : "English"} />
						<Row label={t("termsAccepted")} value={formatDateTime(user.termsAcceptedAt)} />
						<Row label={t("registered")} value={formatDateTime(user.createdAt)} />
						<Row label={t("lastSignIn")} value={formatDateTime(user.lastLoginAt)} />
						<Row
							label={t("activity")}
							value={`${user.counts.orders} orders · ${user.counts.quotes} quotes · ${user.counts.addresses} addresses`}
						/>
					</dl>
				</Panel>

				<div className="space-y-5">
					<Panel title={t("role")}>
						<p className="text-muted-foreground mb-3 text-sm">
							A role decides what this account pays. Only an administrator can change it, and
							never their own.
						</p>
						<Select
							value={user.role === "GUEST" ? "B2C" : user.role}
							disabled={!canSetRole || busy}
							onValueChange={(value) =>
								run(
									() => setRole({ id: user.id, role: value as AssignableRole }).unwrap(),
									`${name} is now ${ROLE_LABEL[value as AssignableRole]}.`
								)
							}
						>
							<SelectTrigger className="w-full" aria-label={t("role")}>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{ASSIGNABLE_ROLES.map((value) => (
									<SelectItem key={value} value={value}>
										{ROLE_LABEL[value]}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						{!canSetRole && (
							<p className="text-muted-foreground mt-2 text-xs">
								{isSelf
									? "You cannot change your own role."
									: user.deletedAt
										? "Restore the account first."
										: "Administrators only."}
							</p>
						)}
					</Panel>

					<Panel title={t("accountState")}>
						<div className="space-y-2">
							{STATUS_ACTIONS.map((action) => {
								const current = user.status === action.value

								return (
									<button
										key={action.value}
										type="button"
										disabled={!canModerate || busy || current}
										aria-pressed={current}
										onClick={() =>
											run(
												() =>
													setStatus({
														id: user.id,
														status: action.value as AssignableStatus,
													}).unwrap(),
												`${name} is now ${action.label.toLowerCase()}.`
											)
										}
										className={cn(
											"w-full rounded-md border p-3 text-left transition-colors",
											current
												? "border-primary bg-accent-soft"
												: "hover:border-foreground/30 disabled:opacity-50",
											!canModerate && "cursor-not-allowed"
										)}
									>
										<span className="flex items-center justify-between gap-2 text-sm font-medium">
											{action.label}
											{current && <Check className="text-primary size-4" />}
										</span>
										<span className="text-muted-foreground mt-0.5 block text-xs">
											{action.hint}
										</span>
									</button>
								)
							})}
						</div>

						{!canModerate && (
							<p className="text-muted-foreground mt-3 text-xs">
								{isSelf
									? "You cannot change your own account state."
									: user.deletedAt
										? "Restore the account first."
										: "Only an administrator can act on a staff account."}
							</p>
						)}
					</Panel>
				</div>
			</div>

			{/* The dealer application. Present only for accounts that applied — which
			    is what makes a separate dealer screen unnecessary. */}
			{application && (
				<Panel
					title={t("dealerApplication")}
					action={
						application.reviewedAt ? (
							<span className="text-muted-foreground text-xs">
								Reviewed {formatDate(application.reviewedAt)}
							</span>
						) : (
							<span className="text-primary text-xs font-medium">{t("awaitingReview")}</span>
						)
					}
				>
					<div className="grid gap-6 md:grid-cols-2">
						<dl>
							<Row label={t("company")} value={application.companyName} />
							<Row label="VAT number" value={application.vatNumber} />
							<Row label={t("registerNumber")} value={application.registerNumber} />
							<Row label={t("founded")} value={formatDate(application.foundingDate)} />
							<Row
								label={t("website")}
								value={
									application.website ? (
										<a
											href={application.website}
											target="_blank"
											rel="noreferrer noopener"
											className="text-primary hover:underline"
										>
											{application.website}
										</a>
									) : null
								}
							/>
							<Row label={t("businessType")} value={application.businessType} />
							<Row label={t("expectedVolume")} value={application.expectedVolume} />
							<Row label="PSI member" value={application.psiMember ? "Yes" : "No"} />
						</dl>

						<dl>
							<Row
								label={t("contact")}
								value={[application.salutation, application.firstName, application.lastName]
									.filter(Boolean)
									.join(" ")}
							/>
							<Row label={t("phone")} value={application.phone} />
							<Row
								label={t("address")}
								value={[
									application.street,
									application.street2,
									`${application.postcode} ${application.city}`,
									countryName(application.countryCode),
								]
									.filter(Boolean)
									.join(", ")}
							/>
							<Row label={t("submitted")} value={formatDateTime(application.createdAt)} />
							<Row label={t("reviewNote")} value={application.reviewNote} />
						</dl>
					</div>

					{application.message && (
						<div className="bg-muted mt-4 rounded-md p-3">
							<p className="text-muted-foreground mb-1 text-xs">{t("theirMessage")}</p>
							<p className="text-sm whitespace-pre-wrap">{application.message}</p>
						</div>
					)}

					{/* The decision endpoint records who decided and why, which the plain
					    approve/reject pair cannot — so it is the one used whenever there
					    is an application to annotate. */}
					{user.status === "PENDING" && canModerate && (
						<div className="mt-4 flex gap-2">
							<Button
								disabled={busy}
								onClick={() =>
									run(
										() => decide({ id: application.id, approve: true }).unwrap(),
										`${name} approved — they now see dealer prices.`
									)
								}
							>
								<Check />{t("approveAsDealer")}</Button>
							<Button
								variant="outline"
								disabled={busy}
								onClick={() =>
									run(
										() => decide({ id: application.id, approve: false }).unwrap(),
										`${name} rejected.`
									)
								}
							>
								<X />{t("reject")}</Button>
						</div>
					)}
				</Panel>
			)}

			{/* Pending without an application — a retail registration awaiting a
			    decision. Nothing to annotate, so the plain endpoints. */}
			{user.status === "PENDING" && !application && canModerate && (
				<Panel title={t("registrationAwaitingReview")}>
					<div className="flex gap-2">
						<Button
							disabled={busy}
							onClick={() => run(() => approve(user.id).unwrap(), `${name} approved.`)}
						>
							<Check />{t("approve")}</Button>
						<Button
							variant="outline"
							disabled={busy}
							onClick={() => run(() => reject(user.id).unwrap(), `${name} rejected.`)}
						>
							<X />{t("reject")}</Button>
					</div>
				</Panel>
			)}

			<Panel title={t("deletion")}>
				{user.deletedAt ? (
					<div className="flex flex-wrap items-center gap-3">
						<p className="text-muted-foreground flex-1 text-sm">
							Deleted {formatDateTime(user.deletedAt)}. Nothing has been destroyed — restoring
							puts the account back exactly as it was.
						</p>
						<Button
							disabled={busy}
							onClick={() => run(() => restore(user.id).unwrap(), `${name} restored.`)}
						>
							<RotateCcw />{t("restore")}</Button>
					</div>
				) : (
					<div className="space-y-3">
						<div className="flex flex-wrap items-center gap-3">
							<p className="text-muted-foreground flex-1 text-sm">
								Deleting hides the account, ends its sessions and refuses sign-in. It keeps the
								email address reserved and can be undone.
							</p>
							<Button
								variant="outline"
								disabled={busy || isSelf}
								onClick={() =>
									run(
										() => remove(user.id).unwrap(),
										`${name} deleted. Restore them from the Deleted list.`
									)
								}
							>
								<Trash2 />{t("delete")}</Button>
						</div>

						{/* Admin only, and behind a confirmation, because orders lose their
						    customer and there is no way back. */}
						{isAdmin && !isSelf && (
							<div className="border-negative/30 flex flex-wrap items-center gap-3 rounded-md border border-dashed p-3">
								<p className="text-muted-foreground flex-1 text-sm">
									Permanent deletion destroys the row. Past orders stay in the books but lose
									their link to this customer, and nothing can be recovered.
								</p>
								<Button
									variant="destructive"
									disabled={busy}
									onClick={() => setConfirmPurge(true)}
								>{t("deletePermanently")}</Button>
							</div>
						)}
					</div>
				)}
			</Panel>

			<AlertDialog open={confirmPurge} onOpenChange={setConfirmPurge}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Permanently delete {name}?</AlertDialogTitle>
						<AlertDialogDescription>
							The account, its addresses, cart, wishlist and sessions are destroyed. Their{" "}
							{user.counts.orders} order(s) and {user.counts.quotes} quote(s) remain in the
							records but will no longer be linked to a customer. This cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
						<AlertDialogAction
							onClick={async () => {
								setConfirmPurge(false)
								await run(() => purge(user.id).unwrap(), `${name} permanently deleted.`)
								router.push("/admin/dashboard/users")
							}}
						>{t("deletePermanently")}</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			<p className="text-muted-foreground text-xs">
				<Link href="/admin/dashboard/users" className="hover:text-foreground underline">{t("backToAllUsers")}</Link>
			</p>
		</div>
	)
}
