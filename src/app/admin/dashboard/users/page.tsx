"use client"

import { useState } from "react"
import { Check, Loader2, X } from "lucide-react"
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
	useApproveCustomerMutation,
	useCustomersQuery,
	useRejectCustomerMutation,
	useSetCustomerRoleMutation,
} from "@/redux/api/customerApi"
import type { AssignableRole, UserRole, UserStatus } from "@/types/customer"

const ANY = "__any__"
const PER_PAGE = 20

const STATUS_CHIP: Record<UserStatus, { label: string; className: string }> = {
	ACTIVE: { label: "Active", className: "border-transparent bg-positive-soft text-positive" },
	PENDING: {
		label: "Awaiting review",
		className: "border-transparent bg-accent-soft-strong text-primary",
	},
	REJECTED: { label: "Rejected", className: "border-transparent bg-negative-soft text-negative" },
}

/** GUEST is never stored on a user row — it exists only so pricing has a role for anonymous requests. */
const ROLE_LABEL: Record<UserRole, string> = {
	GUEST: "Guest",
	B2C: "Retail",
	RESELLER: "Dealer",
	SHOP_MANAGER: "Shop manager",
	ADMIN: "Admin",
}

const ASSIGNABLE: AssignableRole[] = ["B2C", "RESELLER", "SHOP_MANAGER", "ADMIN"]

const formatDate = (value: string) =>
	new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })

export default function CustomersPage() {
	const [search, setSearch] = useState("")
	const [status, setStatus] = useState<UserStatus | undefined>()
	const [role, setRole] = useState<UserRole | undefined>()
	const [page, setPage] = useState(1)
	const [busy, setBusy] = useState<string | null>(null)

	const { data, isLoading, isFetching, isError, error } = useCustomersQuery({
		search: search.trim() || undefined,
		status,
		role,
		page,
		limit: PER_PAGE,
	})

	const [approve] = useApproveCustomerMutation()
	const [reject] = useRejectCustomerMutation()
	const [setRoleFor] = useSetCustomerRoleMutation()

	const customers = data?.data ?? []
	const meta = data?.meta

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
			toast.error(message ?? "Could not update the customer.")
		}
		setBusy(null)
	}

	return (
		<div className="space-y-4">
			<Toolbar
				searchValue={search}
				onSearchChange={(value) => reset(() => setSearch(value))}
				searchPlaceholder="Search email, company or surname…"
				filters={
					<div className="flex flex-wrap gap-2">
						<Select
							value={status ?? ANY}
							onValueChange={(value) =>
								reset(() => setStatus(value === ANY ? undefined : (value as UserStatus)))
							}
						>
							<SelectTrigger className="w-40" aria-label="Filter by status">
								<SelectValue placeholder="Any status" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value={ANY}>Any status</SelectItem>
								{(Object.keys(STATUS_CHIP) as UserStatus[]).map((value) => (
									<SelectItem key={value} value={value}>
										{STATUS_CHIP[value].label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>

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
								{ASSIGNABLE.map((value) => (
									<SelectItem key={value} value={value}>
										{ROLE_LABEL[value]}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
				}
			/>

			{isLoading && (
				<div className="bg-card text-muted-foreground flex items-center justify-center gap-2 rounded-lg border p-16 text-sm">
					<Loader2 className="size-4 animate-spin" />
					Loading customers…
				</div>
			)}

			{isError && (
				<div className="text-destructive bg-card rounded-lg border border-dashed p-16 text-center text-sm">
					{(error as { data?: { message?: string } })?.data?.message ??
						"Could not load customers."}
				</div>
			)}

			{data && (
				<div className="bg-card overflow-hidden rounded-lg border">
					<div className="overflow-x-auto">
						<Table>
							<TableHeader className="bg-muted/50">
								<TableRow className="hover:bg-transparent">
									{["Customer", "Company", "VAT number", "Role", "Registered", "Status"].map(
										(head) => (
											<TableHead
												key={head}
												className="text-muted-foreground text-xs font-medium tracking-wide uppercase"
											>
												{head}
											</TableHead>
										)
									)}
									<TableHead className="w-28 pr-4" />
								</TableRow>
							</TableHeader>

							<TableBody>
								{!customers.length && (
									<TableRow className="hover:bg-transparent">
										<TableCell colSpan={7} className="h-40 text-center">
											<p className="text-muted-foreground text-sm">
												No customers match these filters.
											</p>
										</TableCell>
									</TableRow>
								)}

								{customers.map((customer) => {
									const chip = STATUS_CHIP[customer.status]
									const name =
										[customer.firstName, customer.lastName].filter(Boolean).join(" ") || "—"

									return (
										<TableRow key={customer.id}>
											<TableCell>
												<span className="text-sm font-medium">{name}</span>
												<span className="text-muted-foreground block text-xs">
													{customer.email}
												</span>
											</TableCell>
											<TableCell className="text-sm">{customer.company ?? "—"}</TableCell>
											<TableCell className="font-mono text-xs">
												{customer.vatNumber ?? "—"}
											</TableCell>
											<TableCell>
												<Select
													value={customer.role}
													disabled={busy === customer.id}
													onValueChange={(value) =>
														run(
															customer.id,
															() =>
																setRoleFor({
																	id: customer.id,
																	role: value as AssignableRole,
																}).unwrap(),
															`${name} is now ${ROLE_LABEL[value as UserRole]}.`
														)
													}
												>
													<SelectTrigger
														className="h-8 w-36"
														aria-label={`Role for ${customer.email}`}
													>
														<SelectValue />
													</SelectTrigger>
													<SelectContent>
														{ASSIGNABLE.map((value) => (
															<SelectItem key={value} value={value}>
																{ROLE_LABEL[value]}
															</SelectItem>
														))}
													</SelectContent>
												</Select>
											</TableCell>
											<TableCell className="text-muted-foreground text-xs">
												{formatDate(customer.createdAt)}
											</TableCell>
											<TableCell>
												<Badge variant="outline" className={chip.className}>
													{chip.label}
												</Badge>
											</TableCell>
											<TableCell className="pr-4">
												{/* Only a pending account has a decision to make. */}
												{customer.status === "PENDING" && (
													<div className="flex justify-end gap-1">
														<Button
															variant="ghost"
															size="icon"
															aria-label={`Approve ${customer.email}`}
															disabled={busy === customer.id}
															onClick={() =>
																run(
																	customer.id,
																	() => approve(customer.id).unwrap(),
																	`${name} approved.`
																)
															}
														>
															<Check className="text-positive" />
														</Button>
														<Button
															variant="ghost"
															size="icon"
															aria-label={`Reject ${customer.email}`}
															disabled={busy === customer.id}
															onClick={() =>
																run(
																	customer.id,
																	() => reject(customer.id).unwrap(),
																	`${name} rejected.`
																)
															}
														>
															<X className="text-muted-foreground" />
														</Button>
													</div>
												)}
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
								{meta.total} {meta.total === 1 ? "customer" : "customers"} · page {meta.page}{" "}
								of {meta.totalPages}
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
