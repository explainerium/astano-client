"use client"

import { useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Check, ChevronRight, Loader2, RotateCcw, Trash2, X } from "lucide-react"
import { toast } from "sonner"
import Toolbar from "@/components/dashboard/shell/Toolbar"
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
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table"
import {
	useApproveUserMutation,
	useDeleteUserMutation,
	useRejectUserMutation,
	useRestoreUserMutation,
	useUsersQuery,
} from "@/redux/api/userApi"
import useUserInfo from "@/hooks/useUserInfo"
import { cn } from "@/lib/utils"
import type { UserRole, UserStatus } from "@/types/user"
import {
	ASSIGNABLE_ROLES,
	formatDate,
	nameOf,
	ROLE_LABEL,
	STATUS_CHIP,
} from "./_components/userLabels"

const ANY = "__any__"
const PER_PAGE = 20

/** The tab strip. "All" first, then the states that need somebody to do something. */
const TABS: { value: UserStatus | undefined; label: string }[] = [
	{ value: undefined, label: "All" },
	{ value: "PENDING", label: "Awaiting review" },
	{ value: "ACTIVE", label: "Active" },
	{ value: "SUSPENDED", label: "Suspended" },
	{ value: "DRAFT", label: "Draft" },
	{ value: "REJECTED", label: "Rejected" },
]

/**
 * Users — every account, one screen.
 *
 * Retail customers, dealers and staff differ by a column, so they are filters
 * here rather than separate pages. The dealer queue this replaced is the
 * "Awaiting review" tab, and the application itself lives on the account's own
 * page where the decision is made.
 */
export default function UsersPage() {
	/*
	 * The dashboard's "Review" link lands here with ?status=PENDING, so the tab
	 * it opens on comes from the URL. Only the initial value — after that the
	 * tabs are local state, because clicking one is not a navigation.
	 */
	const searchParams = useSearchParams()
	const initialStatus = searchParams.get("status") as UserStatus | null

	const [search, setSearch] = useState("")
	const [status, setStatus] = useState<UserStatus | undefined>(initialStatus ?? undefined)
	const [role, setRole] = useState<UserRole | undefined>()
	const [deleted, setDeleted] = useState(false)
	const [page, setPage] = useState(1)
	const [busy, setBusy] = useState<string | null>(null)

	const { userInfo } = useUserInfo()

	const { data, isLoading, isFetching, isError, error } = useUsersQuery({
		search: search.trim() || undefined,
		status,
		role,
		deleted: deleted || undefined,
		page,
		limit: PER_PAGE,
	})

	const [approve] = useApproveUserMutation()
	const [reject] = useRejectUserMutation()
	const [remove] = useDeleteUserMutation()
	const [restore] = useRestoreUserMutation()

	const users = data?.data ?? []
	const meta = data?.meta

	/** Any filter change returns to page 1 — page 4 of one filter is not page 4 of another. */
	const reset = (fn: () => void) => {
		fn()
		setPage(1)
	}

	const run = async (id: string, action: () => Promise<unknown>, success: string) => {
		setBusy(id)
		try {
			await action()
			toast.success(success)
		} catch (err) {
			const message = (err as { data?: { message?: string } })?.data?.message
			toast.error(message ?? "Could not update the account.")
		}
		setBusy(null)
	}

	return (
		<div className="space-y-4">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<h1 className="font-heading text-xl font-semibold tracking-tight">Users</h1>
					<p className="text-muted-foreground text-sm">
						Customers, dealers and staff. Roles and account state are set here.
					</p>
				</div>

				{/* The recycle bin is a mode, not a filter — it replaces the list rather
				    than narrowing it, so it sits apart from the filters below. */}
				<Button
					variant={deleted ? "default" : "outline"}
					size="sm"
					onClick={() => reset(() => setDeleted((value) => !value))}
				>
					<Trash2 />
					{deleted ? "Viewing deleted" : "Deleted"}
				</Button>
			</div>

			{!deleted && (
				<div className="border-border bg-card flex flex-wrap gap-1 rounded-lg border p-1">
					{TABS.map((tab) => {
						const count = tab.value ? meta?.counts?.[tab.value] : meta?.total
						const active = status === tab.value

						return (
							<button
								key={tab.label}
								type="button"
								onClick={() => reset(() => setStatus(tab.value))}
								aria-pressed={active}
								className={cn(
									"flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
									active
										? "bg-primary text-primary-foreground"
										: "text-muted-foreground hover:text-foreground"
								)}
							>
								{tab.label}
								{count !== undefined && (
									<span
										className={cn(
											"rounded px-1.5 text-xs tabular-nums",
											active ? "bg-white/20" : "bg-muted"
										)}
									>
										{count}
									</span>
								)}
							</button>
						)
					})}
				</div>
			)}

			<Toolbar
				searchValue={search}
				onSearchChange={(value) => reset(() => setSearch(value))}
				searchPlaceholder="Search email, company or name…"
				filters={
					<Select
						value={role ?? ANY}
						onValueChange={(value) =>
							reset(() => setRole(value === ANY ? undefined : (value as UserRole)))
						}
					>
						<SelectTrigger className="w-40" aria-label="Filter by role">
							<SelectValue placeholder="Any role" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value={ANY}>Any role</SelectItem>
							{ASSIGNABLE_ROLES.map((value) => (
								<SelectItem key={value} value={value}>
									{ROLE_LABEL[value]}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				}
			/>

			{isLoading && (
				<div className="bg-card text-muted-foreground flex items-center justify-center gap-2 rounded-lg border p-16 text-sm">
					<Loader2 className="size-4 animate-spin" />
					Loading accounts…
				</div>
			)}

			{isError && (
				<div className="text-destructive bg-card rounded-lg border border-dashed p-16 text-center text-sm">
					{(error as { data?: { message?: string } })?.data?.message ?? "Could not load accounts."}
				</div>
			)}

			{data && (
				<div className="bg-card overflow-hidden rounded-lg border">
					<div className="overflow-x-auto">
						<Table>
							<TableHeader className="bg-muted/50">
								<TableRow className="hover:bg-transparent">
									{["Account", "Company", "Role", "Registered", "Last sign-in", "Status"].map(
										(head) => (
											<TableHead
												key={head}
												className="text-muted-foreground text-xs font-medium tracking-wide uppercase"
											>
												{head}
											</TableHead>
										)
									)}
									<TableHead className="w-32 pr-4" />
								</TableRow>
							</TableHeader>

							<TableBody>
								{!users.length && (
									<TableRow className="hover:bg-transparent">
										<TableCell colSpan={7} className="h-40 text-center">
											<p className="text-muted-foreground text-sm">
												{deleted
													? "Nothing has been deleted."
													: "No accounts match these filters."}
											</p>
										</TableCell>
									</TableRow>
								)}

								{users.map((user) => {
									const chip = STATUS_CHIP[user.status]
									const name = nameOf(user)
									const isSelf = user.id === userInfo?.sub

									return (
										<TableRow key={user.id}>
											<TableCell>
												<Link
													href={`/admin/dashboard/users/${user.id}`}
													className="hover:text-primary text-sm font-medium"
												>
													{name}
												</Link>
												<span className="text-muted-foreground block text-xs">
													{user.email}
													{isSelf && " · you"}
												</span>
											</TableCell>
											<TableCell className="text-sm">{user.company ?? "—"}</TableCell>
											<TableCell className="text-sm">{ROLE_LABEL[user.role]}</TableCell>
											<TableCell className="text-muted-foreground text-xs">
												{formatDate(user.createdAt)}
											</TableCell>
											<TableCell className="text-muted-foreground text-xs">
												{formatDate(user.lastLoginAt)}
											</TableCell>
											<TableCell>
												<Badge variant="outline" className={chip.className}>
													{chip.label}
												</Badge>
											</TableCell>
											<TableCell className="pr-4">
												<div className="flex items-center justify-end gap-1">
													{deleted ? (
														<Button
															variant="ghost"
															size="sm"
															disabled={busy === user.id}
															onClick={() =>
																run(
																	user.id,
																	() => restore(user.id).unwrap(),
																	`${name} restored.`
																)
															}
														>
															<RotateCcw />
															Restore
														</Button>
													) : (
														<>
															{/* Only a pending account has a decision waiting. */}
															{user.status === "PENDING" && (
																<>
																	<Button
																		variant="ghost"
																		size="icon"
																		aria-label={`Approve ${user.email}`}
																		disabled={busy === user.id}
																		onClick={() =>
																			run(
																				user.id,
																				() => approve(user.id).unwrap(),
																				`${name} approved.`
																			)
																		}
																	>
																		<Check className="text-positive" />
																	</Button>
																	<Button
																		variant="ghost"
																		size="icon"
																		aria-label={`Reject ${user.email}`}
																		disabled={busy === user.id || isSelf}
																		onClick={() =>
																			run(
																				user.id,
																				() => reject(user.id).unwrap(),
																				`${name} rejected.`
																			)
																		}
																	>
																		<X className="text-muted-foreground" />
																	</Button>
																</>
															)}

															{/* Never offered on your own row — the API refuses it
															    and an enabled button that always fails is worse
															    than no button. */}
															{!isSelf && (
																<Button
																	variant="ghost"
																	size="icon"
																	aria-label={`Delete ${user.email}`}
																	disabled={busy === user.id}
																	onClick={() =>
																		run(
																			user.id,
																			() => remove(user.id).unwrap(),
																			`${name} deleted. You can restore them from Deleted.`
																		)
																	}
																>
																	<Trash2 className="text-muted-foreground" />
																</Button>
															)}

															<Link
																href={`/admin/dashboard/users/${user.id}`}
																aria-label={`Open ${user.email}`}
																className="text-muted-foreground hover:text-foreground p-2"
															>
																<ChevronRight className="size-4" />
															</Link>
														</>
													)}
												</div>
											</TableCell>
										</TableRow>
									)
								})}
							</TableBody>
						</Table>
					</div>

					{!!meta && meta.total > 0 && (
						<div className="text-muted-foreground flex flex-wrap items-center gap-3 border-t px-4 py-2.5 text-xs">
							<span>
								{meta.total} {meta.total === 1 ? "account" : "accounts"} · page {meta.page} of{" "}
								{meta.totalPages}
							</span>
							{isFetching && <Loader2 className="size-3 animate-spin" />}
							<div className="ml-auto flex gap-2">
								<Button
									variant="outline"
									size="sm"
									disabled={meta.page <= 1 || isFetching}
									onClick={() => setPage((p) => Math.max(1, p - 1))}
								>
									Previous
								</Button>
								<Button
									variant="outline"
									size="sm"
									disabled={meta.page >= meta.totalPages || isFetching}
									onClick={() => setPage((p) => p + 1)}
								>
									Next
								</Button>
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	)
}
