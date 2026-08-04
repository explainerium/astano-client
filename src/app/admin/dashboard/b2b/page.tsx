"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, Loader2 } from "lucide-react"
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
import { useDealerApplicationsQuery } from "@/redux/api/dealerApi"
import type { DealerStatus } from "@/types/dealer"
import { DEALER_STATUS, DEALER_STATUS_OPTIONS, formatDate } from "./_components/dealerStatus"

const ANY = "__any__"
const PER_PAGE = 20

export default function DealersPage() {
	const router = useRouter()
	const [search, setSearch] = useState("")
	const [status, setStatus] = useState<DealerStatus | undefined>("PENDING")
	const [page, setPage] = useState(1)

	const { data, isLoading, isFetching, isError, error } = useDealerApplicationsQuery({
		search: search.trim() || undefined,
		status,
		page,
		limit: PER_PAGE,
	})

	const applications = data?.data ?? []
	const meta = data?.meta

	const reset = (fn: () => void) => {
		fn()
		setPage(1)
	}

	return (
		<div className="space-y-4">
			<Toolbar
				searchValue={search}
				onSearchChange={(value) => reset(() => setSearch(value))}
				searchPlaceholder="Search company, name or email…"
				filters={
					<Select
						value={status ?? ANY}
						onValueChange={(value) =>
							reset(() => setStatus(value === ANY ? undefined : (value as DealerStatus)))
						}
					>
						<SelectTrigger className="w-44" aria-label="Filter by status">
							<SelectValue placeholder="Any status" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value={ANY}>Any status</SelectItem>
							{DEALER_STATUS_OPTIONS.map((option) => (
								<SelectItem key={option.value} value={option.value}>
									{option.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				}
			/>

			{isLoading && (
				<div className="bg-card text-muted-foreground flex items-center justify-center gap-2 rounded-lg border p-16 text-sm">
					<Loader2 className="size-4 animate-spin" />
					Loading applications…
				</div>
			)}

			{isError && (
				<div className="text-destructive bg-card rounded-lg border border-dashed p-16 text-center text-sm">
					{(error as { data?: { message?: string } })?.data?.message ??
						"Could not load applications."}
				</div>
			)}

			{data && (
				<div className="bg-card overflow-hidden rounded-lg border">
					<div className="overflow-x-auto">
						<Table>
							<TableHeader className="bg-muted/50">
								<TableRow className="hover:bg-transparent">
									{["Company", "Contact", "VAT number", "Country", "Applied", "Status"].map(
										(head) => (
											<TableHead
												key={head}
												className="text-muted-foreground text-xs font-medium tracking-wide uppercase"
											>
												{head}
											</TableHead>
										)
									)}
									<TableHead className="w-16 pr-4" />
								</TableRow>
							</TableHeader>

							<TableBody>
								{!applications.length && (
									<TableRow className="hover:bg-transparent">
										<TableCell colSpan={7} className="h-40 text-center">
											<p className="text-muted-foreground text-sm">
												{status === "PENDING"
													? "Nothing waiting for review."
													: "No applications match these filters."}
											</p>
										</TableCell>
									</TableRow>
								)}

								{applications.map((application) => {
									const chip = DEALER_STATUS[application.status]

									return (
										<TableRow
											key={application.id}
											className="cursor-pointer"
											onClick={() => router.push(`/admin/dashboard/b2b/${application.id}`)}
										>
											<TableCell className="font-medium">
												{application.company.name ?? "—"}
											</TableCell>
											<TableCell className="text-sm">
												{[application.contact.firstName, application.contact.lastName]
													.filter(Boolean)
													.join(" ") || "—"}
												<span className="text-muted-foreground block text-xs">
													{application.email}
												</span>
											</TableCell>
											<TableCell className="font-mono text-xs">
												{application.company.vatNumber ?? "—"}
											</TableCell>
											<TableCell className="text-xs">
												{application.address.countryCode ?? "—"}
											</TableCell>
											<TableCell className="text-muted-foreground text-xs">
												{formatDate(application.submittedAt)}
											</TableCell>
											<TableCell>
												<Badge variant="outline" className={chip.className}>
													{chip.label}
												</Badge>
											</TableCell>
											<TableCell className="pr-4">
												<div className="flex justify-end">
													<Button
														variant="ghost"
														size="icon"
														aria-label={`Open ${application.company.name ?? application.email}`}
														onClick={(event) => {
															event.stopPropagation()
															router.push(`/admin/dashboard/b2b/${application.id}`)
														}}
													>
														<Eye />
													</Button>
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
								{meta.total} {meta.total === 1 ? "application" : "applications"} · page{" "}
								{meta.page} of {meta.totalPages}
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
