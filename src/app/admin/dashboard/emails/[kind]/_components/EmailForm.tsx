"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Lock, RotateCcw } from "lucide-react"
import { toast } from "sonner"
import { z } from "zod"
import ProCheckbox from "@/components/form/ProCheckbox"
import ProForm from "@/components/form/ProForm"
import ProInput from "@/components/form/ProInput"
import ProSubmit from "@/components/form/ProSubmit"
import ProTextarea from "@/components/form/ProTextarea"
import { Button } from "@/components/ui/button"
import { useResetEmailTemplateMutation, useSaveEmailTemplateMutation } from "@/redux/api/emailApi"
import type { EmailTemplate } from "@/types/email"

/**
 * What the admin may change about one message.
 *
 * Every text field is an override, and every one of them is optional: blank
 * means the built-in wording, translated per language. That matters more here
 * than it looks — typing an English subject would otherwise silently replace
 * the German one too, and nobody would notice until a German customer got an
 * English email.
 */

const schema = z.object({
	enabled: z.boolean(),
	subject: z.string().trim().max(200),
	heading: z.string().trim().max(200),
	additionalContent: z.string().trim().max(4000),
	recipient: z.union([z.literal(""), z.email({ message: "Enter an email address" })]),
})

export const EmailForm = ({ template }: { template: EmailTemplate }) => {
	const [save] = useSaveEmailTemplateMutation()
	const [reset, { isLoading: isResetting }] = useResetEmailTemplateMutation()

	const onSubmit = async (values: z.infer<typeof schema>) => {
		try {
			await save({ kind: template.key, data: values }).unwrap()
			toast.success("Saved.")
		} catch (error) {
			const message = (error as { data?: { message?: string } })?.data?.message
			toast.error(message ?? "Could not save that.")
		}
	}

	const onReset = async () => {
		try {
			await reset(template.key).unwrap()
			toast.success("Back to the default wording.")
		} catch (error) {
			const message = (error as { data?: { message?: string } })?.data?.message
			toast.error(message ?? "Could not reset that.")
		}
	}

	return (
		<ProForm
			// Remounts when a save returns new values, so the fields show what was
			// actually stored rather than what was typed.
			key={JSON.stringify(template.override)}
			onSubmit={onSubmit}
			resolver={zodResolver(schema)}
			defaultValues={template.override}
			className="space-y-4"
		>
			{template.canDisable ? (
				<ProCheckbox
					name="enabled"
					label="Send this email"
					description="Off means it is never sent, to anyone."
				/>
			) : (
				<div className="bg-accent-soft flex items-start gap-3 rounded-lg border p-4 text-sm">
					<Lock className="text-primary mt-0.5 size-4 shrink-0" />
					<p>
						<strong>Always sent.</strong> {template.description}
					</p>
				</div>
			)}

			<ProInput
				name="subject"
				label="Subject"
				description="Leave empty for the built-in wording, which is already translated. {shop} and the values shown below can be used."
			/>

			<ProInput
				name="heading"
				label="Heading"
				description="The large line inside the message. Leave empty for the default."
			/>

			<ProTextarea
				name="additionalContent"
				label="Additional content"
				description="Appended above the footer — a returns policy, holiday despatch dates. Blank lines start a new paragraph."
			/>

			{!!template.recipientSetting && (
				<ProInput
					name="recipient"
					label="Send to"
					description="Leave empty to use the address configured in Settings."
				/>
			)}

			<div className="flex items-center justify-between gap-3">
				<Button type="button" variant="ghost" size="sm" onClick={onReset} disabled={isResetting}>
					<RotateCcw className="size-4" />
					Reset to default
				</Button>
				<ProSubmit>Save</ProSubmit>
			</div>
		</ProForm>
	)
}

export default EmailForm
