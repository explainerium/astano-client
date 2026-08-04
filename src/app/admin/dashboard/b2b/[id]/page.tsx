"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowLeft, Check, Loader2, X } from "lucide-react"
import { toast } from "sonner"
import { z } from "zod"
import ProForm from "@/components/form/ProForm"
import ProSubmit from "@/components/form/ProSubmit"
import ProTextarea from "@/components/form/ProTextarea"
import {
	AlertDialog,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useDealerApplicationQuery, useDecideDealerMutation } from "@/redux/api/dealerApi"
import type { DealerApplication } from "@/types/dealer"
import { DEALER_STATUS, formatDate } from "../_components/dealerStatus"

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
	<div className="flex justify-between gap-4 py-1.5">
		<dt className="text-muted-foreground text-sm">{label}</dt>
		<dd className="text-right text-sm">{value || "—"}</dd>
	</div>
)

const DecisionDialog = ({
	application,
	approve,
	onClose,
}: {
	application: DealerApplication
	approve: boolean
	onClose: () => void
}) => {
	const [decide] = useDecideDealerMutation()

	const schema = z.object({ note: z.string().trim().max(1000) })
	type FormValues = z.infer<typeof schema>

	const onSubmit = async (form: FormValues) => {
		try {
			await decide({
				id: application.id,
				data: { approve, ...(form.note.trim() ? { note: form.note.trim() } : {}) },
			}).unwrap()
			toast.success(approve ? "Dealer approved." : "Application rejected.")
			onClose()
		} catch (error) {
			const message = (error as { data?: { message?: string } })?.data?.message
			toast.error(message ?? "Could not record the decision.")
		}
	}

	return (
		<AlertDialog open onOpenChange={(open) => !open && onClose()}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>
						{approve ? "Approve" : "Reject"} {application.company.name ?? application.email}?
					</AlertDialogTitle>
					<AlertDialogDescription>
						{approve
							? "They move to Reseller pricing immediately and are emailed that the account is open."
							: "They keep their account and guest pricing, and any session they have open is ended."}
					</AlertDialogDescription>
				</AlertDialogHeader>

				<ProForm
					onSubmit={onSubmit}
					resolver={zodResolver(schema)}
					defaultValues={{ note: "" }}
					className="space-y-4"
				>
					<ProTextarea
						name="note"
						label="Note"
						description="Recorded against the decision. Internal — not sent to the applicant."
					/>
					<div className="flex justify-end gap-2">
						<Button type="button" variant="ghost" onClick={onClose}>
							Cancel
						</Button>
						<ProSubmit>{approve ? "Approve dealer" : "Reject"}</ProSubmit>
					</div>
				</ProForm>
			</AlertDialogContent>
		</AlertDialog>
	)
}

export default function DealerDetailPage() {
	const router = useRouter()
	const params = useParams<{ id: string }>()
	const { data: application, isLoading, isError, error } = useDealerApplicationQuery(params.id)
	const [decision, setDecision] = useState<boolean | null>(null)

	if (isLoading) {
		return (
			<div className="bg-card text-muted-foreground flex items-center justify-center gap-2 rounded-lg border p-16 text-sm">
				<Loader2 className="size-4 animate-spin" />
				Loading application…
			</div>
		)
	}

	if (isError || !application) {
		return (
			<div className="text-destructive bg-card rounded-lg border border-dashed p-16 text-center text-sm">
				{(error as { data?: { message?: string } })?.data?.message ??
					"Could not load the application."}
			</div>
		)
	}

	const chip = DEALER_STATUS[application.status]
	const { company, address, contact } = application
	const pending = application.status === "PENDING"

	return (
		<div className="space-y-5">
			<div className="bg-background sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b py-3">
				<Button
					type="button"
					variant="ghost"
					size="lg"
					onClick={() => router.push("/admin/dashboard/b2b")}
				>
					<ArrowLeft />
					Dealers
				</Button>
				<h1 className="font-heading text-sm font-semibold">
					{company.name ?? application.email}
				</h1>
				<Badge variant="outline" className={chip.className}>
					{chip.label}
				</Badge>

				<div className="ml-auto flex gap-2">
					<Button
						variant="outline"
						size="lg"
						disabled={!pending}
						onClick={() => setDecision(false)}
					>
						<X />
						Reject
					</Button>
					<Button size="lg" disabled={!pending} onClick={() => setDecision(true)}>
						<Check />
						Approve
					</Button>
				</div>
			</div>

			{pending && (
				<div className="bg-accent-soft flex items-start gap-3 rounded-lg border p-4 text-sm">
					<p>
						<strong>Awaiting review.</strong> Until this is approved they are priced as
						a guest, not a dealer — rule R5b. Approving is what unlocks the Reseller
						ladder.
					</p>
				</div>
			)}

			<div className="grid gap-5 lg:grid-cols-2 lg:items-start">
				<section className="bg-card rounded-lg border">
					<h2 className="font-heading border-b px-4 py-3 text-sm font-semibold">Business</h2>
					<dl className="divide-y px-4 py-2">
						<Row label="Company" value={company.name} />
						<Row
							label="VAT number"
							value={company.vatNumber && <span className="font-mono">{company.vatNumber}</span>}
						/>
						<Row label="Register number" value={company.registerNumber} />
						<Row
							label="Founded"
							value={company.foundingDate ? formatDate(company.foundingDate) : null}
						/>
						<Row label="Business type" value={company.businessType} />
						<Row label="Expected volume" value={company.expectedVolume} />
						<Row
							label="Website"
							value={
								company.website && (
									<a
										href={company.website}
										target="_blank"
										rel="noopener noreferrer"
										className="text-primary hover:underline"
									>
										{company.website}
									</a>
								)
							}
						/>
						<Row
							label="PSI member"
							value={company.psiMember === null ? null : company.psiMember ? "Yes" : "No"}
						/>
					</dl>
				</section>

				<section className="bg-card rounded-lg border">
					<h2 className="font-heading border-b px-4 py-3 text-sm font-semibold">Contact</h2>
					<dl className="divide-y px-4 py-2">
						<Row
							label="Name"
							value={[contact.salutation, contact.firstName, contact.lastName]
								.filter(Boolean)
								.join(" ")}
						/>
						<Row label="Email" value={application.email} />
						<Row label="Phone" value={contact.phone} />
						<Row label="Street" value={address.street} />
						<Row label="Address line 2" value={address.street2} />
						<Row
							label="Town"
							value={[address.postcode, address.city].filter(Boolean).join(" ")}
						/>
						<Row label="Country" value={countryName(address.countryCode)} />
						<Row label="Applied" value={formatDate(application.submittedAt)} />
					</dl>
				</section>

				{application.message && (
					<section className="bg-card rounded-lg border lg:col-span-2">
						<h2 className="font-heading border-b px-4 py-3 text-sm font-semibold">
							Their message
						</h2>
						<p className="p-4 text-sm whitespace-pre-line">{application.message}</p>
					</section>
				)}

				{application.review.reviewedAt && (
					<section className="bg-card rounded-lg border lg:col-span-2">
						<h2 className="font-heading border-b px-4 py-3 text-sm font-semibold">Decision</h2>
						<dl className="divide-y px-4 py-2">
							<Row label="Reviewed" value={formatDate(application.review.reviewedAt)} />
							<Row label="Reviewed by" value={application.review.reviewedBy} />
							<Row label="Note" value={application.review.note} />
						</dl>
					</section>
				)}
			</div>

			{decision !== null && (
				<DecisionDialog
					application={application}
					approve={decision}
					onClose={() => setDecision(null)}
				/>
			)}
		</div>
	)
}
