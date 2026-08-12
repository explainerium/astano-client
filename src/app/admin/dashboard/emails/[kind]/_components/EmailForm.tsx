"use client"

import { useTranslations } from "next-intl"
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

/** The dashboard translator, as a type this builder can take. */
type T = (key: string, values?: Record<string, string | number | Date>) => string

const buildSchema = (t: T) =>
	z.object({
		enabled: z.boolean(),
		subject: z.string().trim().max(200),
		heading: z.string().trim().max(200),
		additionalContent: z.string().trim().max(4000),
		recipient: z.union([z.literal(""), z.email({ message: t("enterAnEmailAddress") })]),
	})

type FormValues = z.infer<ReturnType<typeof buildSchema>>

export const EmailForm = ({ template }: { template: EmailTemplate }) => {
	const t = useTranslations("admin")
	const [save] = useSaveEmailTemplateMutation()
	const [reset, { isLoading: isResetting }] = useResetEmailTemplateMutation()

	const onSubmit = async (values: FormValues) => {
		try {
			await save({ kind: template.key, data: values }).unwrap()
			toast.success(t("saved"))
		} catch (error) {
			const message = (error as { data?: { message?: string } })?.data?.message
			toast.error(message ?? t("couldNotSaveThat"))
		}
	}

	const onReset = async () => {
		try {
			await reset(template.key).unwrap()
			toast.success(t("backToTheDefaultWording"))
		} catch (error) {
			const message = (error as { data?: { message?: string } })?.data?.message
			toast.error(message ?? t("couldNotResetThat"))
		}
	}

	return (
		<ProForm
			// Remounts when a save returns new values, so the fields show what was
			// actually stored rather than what was typed.
			key={JSON.stringify(template.override)}
			onSubmit={onSubmit}
			resolver={zodResolver(buildSchema(t))}
			defaultValues={template.override}
			className="space-y-4"
		>
			{template.canDisable ? (
				<ProCheckbox
					name="enabled"
					label={t("sendThisEmail")}
					description={t("offMeansItIsNeverSent")}
				/>
			) : (
				<div className="bg-accent-soft flex items-start gap-3 rounded-lg border p-4 text-sm">
					<Lock className="text-primary mt-0.5 size-4 shrink-0" />
					<p>
						<strong>{t("alwaysSent")}</strong> {template.description}
					</p>
				</div>
			)}

			<ProInput
				name="subject"
				label={t("subject")}
				description={t("leaveEmptyForTheBuiltIn")}
			/>

			<ProInput
				name="heading"
				label={t("heading")}
				description={t("theLargeLineInsideTheMessage")}
			/>

			<ProTextarea
				name="additionalContent"
				label={t("additionalContent")}
				description={t("appendedAboveTheFooterAReturns")}
			/>

			{!!template.recipientSetting && (
				<ProInput
					name="recipient"
					label={t("sendTo")}
					description={t("leaveEmptyToUseTheAddress")}
				/>
			)}

			<div className="flex items-center justify-between gap-3">
				<Button type="button" variant="ghost" size="sm" onClick={onReset} disabled={isResetting}>
					<RotateCcw className="size-4" />{t("resetToDefault")}</Button>
				<ProSubmit>{t("save")}</ProSubmit>
			</div>
		</ProForm>
	)
}

export default EmailForm
