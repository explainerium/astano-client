"use client"

import { useState } from "react"
import { Loader2, Lock, Mail, StickyNote } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useAddOrderNoteMutation, useOrderNotesQuery } from "@/redux/api/orderApi"

/**
 * The note thread on an order.
 *
 * Two buttons rather than a checkbox beside one. "Add private note" and "Send
 * to customer" say what will happen at the moment of pressing; a ticked box
 * above a Save button is the kind of thing people miss, and the mistake here is
 * emailing a customer a remark that was meant for a colleague.
 */
export const OrderNotes = ({ orderId }: { orderId: string }) => {
	const [body, setBody] = useState("")
	const { data: notes, isLoading } = useOrderNotesQuery(orderId)
	const [addNote, { isLoading: isSaving }] = useAddOrderNoteMutation()

	const add = async (isCustomerVisible: boolean) => {
		const text = body.trim()
		if (!text) return

		try {
			await addNote({ id: orderId, data: { body: text, isCustomerVisible } }).unwrap()
			setBody("")
			toast.success(isCustomerVisible ? "Sent to the customer." : "Note added.")
		} catch (error) {
			const message = (error as { data?: { message?: string } })?.data?.message
			toast.error(message ?? "Could not add that note.")
		}
	}

	return (
		<section className="bg-card rounded-lg border">
			<h2 className="font-heading border-b px-4 py-3 text-sm font-semibold">Notes</h2>
			<div className="space-y-4 p-4">
				{isLoading && (
					<p className="text-muted-foreground text-sm">
						<Loader2 className="mr-2 inline size-4 animate-spin" />
						Loading notes…
					</p>
				)}

				{!isLoading && !notes?.length && (
					<p className="text-muted-foreground text-sm">
						No notes yet. Private notes stay here; the other kind is emailed.
					</p>
				)}

				{!!notes?.length && (
					<ol className="space-y-3">
						{notes.map((note) => (
							<li
								key={note.id}
								className={
									note.isCustomerVisible
										? "bg-accent-soft rounded-md border p-3"
										: "bg-muted/50 rounded-md border p-3"
								}
							>
								<div className="mb-1 flex flex-wrap items-center gap-2 text-xs">
									<span className="font-medium">{note.authorName}</span>
									<span className="text-muted-foreground">
										{new Date(note.createdAt).toLocaleString()}
									</span>
									<Badge variant="outline" className="gap-1 font-normal">
										{note.isCustomerVisible ? (
											<>
												<Mail className="size-3" />
												Emailed
											</>
										) : (
											<>
												<Lock className="size-3" />
												Private
											</>
										)}
									</Badge>
								</div>
								<p className="text-sm whitespace-pre-line">{note.body}</p>
							</li>
						))}
					</ol>
				)}

				<div className="space-y-2 border-t pt-4">
					<Textarea
						value={body}
						onChange={(event) => setBody(event.target.value)}
						placeholder="Despatch update, a query, anything worth recording…"
						rows={3}
						aria-label="New note"
					/>

					<div className="flex flex-wrap justify-end gap-2">
						<Button
							type="button"
							variant="outline"
							size="sm"
							disabled={isSaving || !body.trim()}
							onClick={() => add(false)}
						>
							<StickyNote className="size-4" />
							Add private note
						</Button>
						<Button
							type="button"
							size="sm"
							disabled={isSaving || !body.trim()}
							onClick={() => add(true)}
						>
							{isSaving ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
							Send to customer
						</Button>
					</div>
				</div>
			</div>
		</section>
	)
}

export default OrderNotes
