"use client"

import { useTranslations } from "next-intl"
import { useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import {
	ArrowLeft,
	Check,
	CircleAlert,
	CircleCheck,
	Copy,
	ExternalLink,
	Loader2,
} from "lucide-react"
import { toast } from "sonner"
import Panel from "@/components/dashboard/shell/Panel"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
	usePaymentGatewayQuery,
	useSaveGatewayCredentialsMutation,
	useTestGatewayConnectionMutation,
	useUpdateGatewaySettingsMutation,
} from "@/redux/api/paymentGatewayApi"
import { cn } from "@/lib/utils"
import type { ConnectionTestResult, GatewayMode, GatewayProvider } from "@/types/paymentGateway"

const MODES: { value: GatewayMode; label: string; hint: string }[] = [
	{ value: "TEST", label: "Test", hint: "Nothing is charged. Use Stripe’s test cards." },
	{ value: "LIVE", label: "Live", hint: "Real money. Only switch here once the test mode works." },
]

const errorMessage = (error: unknown, fallback: string) =>
	(error as { data?: { message?: string } })?.data?.message ?? fallback

/**
 * One gateway's configuration.
 *
 * A page, not a dialog. There is too much here to sit in a modal — three
 * credentials, a mode, a webhook to copy into another site, a list of methods —
 * and half of it involves leaving for the provider’s dashboard and coming back.
 * A modal that has to survive a round trip through another browser tab is a
 * modal in the wrong place.
 */
export default function PaymentGatewayPage() {
	const t = useTranslations("admin")
	const { provider } = useParams<{ provider: string }>()
	const gatewayProvider = provider.toUpperCase() as GatewayProvider

	const { data: gateway, isLoading, isError, error } = usePaymentGatewayQuery(gatewayProvider)

	const [saveCredentials, saving] = useSaveGatewayCredentialsMutation()
	const [testConnection, testing] = useTestGatewayConnectionMutation()
	const [updateSettings] = useUpdateGatewaySettingsMutation()

	/** Which mode's credentials are being edited. Independent of the live mode. */
	const [editing, setEditing] = useState<GatewayMode | null>(null)
	const [draft, setDraft] = useState<Record<string, string>>({})
	const [result, setResult] = useState<ConnectionTestResult | null>(null)

	if (isLoading) {
		return (
			<div className="bg-card text-muted-foreground flex items-center justify-center gap-2 rounded-lg border p-16 text-sm">
				<Loader2 className="size-4 animate-spin" />{t("loadingGateway")}</div>
		)
	}

	if (isError || !gateway) {
		return (
			<div className="text-destructive bg-card rounded-lg border border-dashed p-16 text-center text-sm">
				{errorMessage(error, "Could not load this gateway.")}
			</div>
		)
	}

	const mode = editing ?? gateway.mode
	const stored = gateway.credentials[mode]
	const missing = gateway.fields.filter((field) => field.required && !stored[field.key]?.isSet)
	const readyToTest = missing.length === 0
	const canGoLive = gateway.lastTest?.succeeded === true && gateway.lastTest.mode === gateway.mode

	const onSave = async () => {
		// Only fields the admin actually typed into. An untouched box means "leave
		// what is stored", which is the normal state of a saved secret.
		const credentials = Object.fromEntries(
			Object.entries(draft).filter(([, value]) => value.trim().length > 0)
		)

		if (!Object.keys(credentials).length) {
			toast.error(t("nothingToSaveFillInAt"))
			return
		}

		try {
			await saveCredentials({ provider: gatewayProvider, mode, credentials }).unwrap()
			setDraft({})
			setResult(null)
			toast.success(t("savedRunAConnectionTestNext"))
		} catch (err) {
			toast.error(errorMessage(err, "Could not save the credentials."))
		}
	}

	const onTest = async () => {
		try {
			const outcome = await testConnection({ provider: gatewayProvider, mode }).unwrap()
			setResult(outcome)
			if (outcome.ok) toast.success(outcome.message)
			else toast.error(outcome.message)
		} catch (err) {
			toast.error(errorMessage(err, "Could not reach the provider."))
		}
	}

	const patch = async (input: Parameters<typeof updateSettings>[0], success: string) => {
		try {
			await updateSettings(input).unwrap()
			toast.success(success)
		} catch (err) {
			toast.error(errorMessage(err, "Could not update the gateway."))
		}
	}

	return (
		<div className="space-y-5">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div className="flex items-start gap-3">
					<Link
						href="/admin/dashboard/payments"
						aria-label={t("backToGateways")}
						className="text-muted-foreground hover:text-foreground p-2"
					>
						<ArrowLeft className="size-4" />
					</Link>
					<div>
						<h1 className="font-heading text-xl font-semibold tracking-tight">{gateway.label}</h1>
						<a
							href={gateway.dashboardUrl}
							target="_blank"
							rel="noreferrer noopener"
							className="text-primary inline-flex items-center gap-1 text-sm hover:underline"
						>
							Open {gateway.label} dashboard
							<ExternalLink className="size-3" />
						</a>
					</div>
				</div>

				<div className="flex items-center gap-3">
					<Badge
						variant="outline"
						className={cn(
							"border-transparent",
							gateway.isActive
								? gateway.mode === "LIVE"
									? "bg-positive-soft text-positive"
									: "bg-accent-soft-strong text-primary"
								: "bg-muted text-muted-foreground"
						)}
					>
						{gateway.isActive ? (gateway.mode === "LIVE" ? "Live" : "Active · test") : "Off"}
					</Badge>

					<div className="flex items-center gap-2">
						<Switch
							id="gateway-active"
							checked={gateway.isActive}
							// The server refuses this too. Disabling it here is about not
							// offering a switch whose only outcome is an error message.
							disabled={!gateway.isActive && !canGoLive}
							onCheckedChange={(checked) =>
								patch(
									{ provider: gatewayProvider, isActive: checked },
									checked ? "Gateway switched on." : "Gateway switched off."
								)
							}
						/>
						<Label htmlFor="gateway-active" className="text-sm">{t("offerAtCheckout")}</Label>
					</div>
				</div>
			</div>

			{!gateway.isActive && !canGoLive && (
				<div className="bg-muted text-muted-foreground rounded-lg px-4 py-3 text-sm">
					This gateway cannot be switched on until a connection test passes in{" "}
					{gateway.mode === "LIVE" ? "Live" : "Test"} mode. That way a mistyped key fails here
					rather than at a customer’s checkout.
				</div>
			)}

			<Panel title={t("mode")}>
				<div className="grid gap-3 sm:grid-cols-2">
					{MODES.map((option) => {
						const current = gateway.mode === option.value
						const configured = gateway.fields
							.filter((field) => field.required)
							.every((field) => gateway.credentials[option.value][field.key]?.isSet)

						return (
							<button
								key={option.value}
								type="button"
								aria-pressed={current}
								onClick={() => {
									setEditing(option.value)
									if (!current) {
										// Changing the running mode switches the gateway off: the
										// new mode has its own keys and its own test result, and
										// neither has been proved yet.
										void patch(
											{ provider: gatewayProvider, mode: option.value, isActive: false },
											`Now using ${option.label.toLowerCase()} keys.`
										)
									}
								}}
								className={cn(
									"rounded-md border p-4 text-left transition-colors",
									current ? "border-primary bg-accent-soft" : "hover:border-foreground/30"
								)}
							>
								<span className="flex items-center justify-between gap-2 text-sm font-medium">
									{option.label}
									{current && <Check className="text-primary size-4" />}
								</span>
								<span className="text-muted-foreground mt-1 block text-xs">{option.hint}</span>
								<span className="text-muted-foreground mt-2 block text-xs">
									{configured ? "Keys stored" : "No keys yet"}
								</span>
							</button>
						)
					})}
				</div>
			</Panel>

			<Panel
				title={`${mode === "LIVE" ? "Live" : "Test"} credentials`}
				action={
					editing && editing !== gateway.mode ? (
						<button
							type="button"
							onClick={() => {
								setEditing(null)
								setDraft({})
							}}
							className="text-muted-foreground hover:text-foreground text-xs underline"
						>
							Back to {gateway.mode === "LIVE" ? "live" : "test"}
						</button>
					) : null
				}
			>
				<div className="space-y-5">
					{gateway.fields.map((field) => {
						const state = stored[field.key]

						return (
							<div key={field.key}>
								<div className="flex flex-wrap items-baseline justify-between gap-2">
									<Label htmlFor={field.key} className="text-sm">
										{field.label}
										{!field.required && (
											<span className="text-muted-foreground ml-1 text-xs">optional</span>
										)}
									</Label>

									{state?.isSet && (
										<span className="text-muted-foreground font-mono text-xs">
											{state.preview}
										</span>
									)}
								</div>

								<Input
									id={field.key}
									// Secrets are type=password so a shared screen or a screenshot
									// does not give one away mid-setup.
									type={field.secret ? "password" : "text"}
									autoComplete="off"
									spellCheck={false}
									placeholder={state?.isSet ? "Stored — leave blank to keep it" : field.placeholder}
									value={draft[field.key] ?? ""}
									onChange={(event) =>
										setDraft((current) => ({ ...current, [field.key]: event.target.value }))
									}
									className="mt-1.5 font-mono text-sm"
								/>
								<p className="text-muted-foreground mt-1.5 text-xs">{field.help}</p>
							</div>
						)
					})}

					<div className="flex flex-wrap items-center gap-2">
						<Button onClick={onSave} disabled={saving.isLoading}>
							{saving.isLoading && <Loader2 className="animate-spin" />}
							Save credentials
						</Button>

						<Button variant="outline" onClick={onTest} disabled={!readyToTest || testing.isLoading}>
							{testing.isLoading && <Loader2 className="animate-spin" />}
							Test connection
						</Button>

						{!readyToTest && (
							<p className="text-muted-foreground text-xs">
								Still needed: {missing.map((field) => field.label).join(", ")}
							</p>
						)}
					</div>

					{(result ?? gateway.lastTest) && (
						<div
							className={cn(
								"flex items-start gap-2 rounded-md p-3 text-sm",
								(result?.ok ?? gateway.lastTest?.succeeded)
									? "bg-positive-soft text-positive"
									: "bg-negative-soft text-negative"
							)}
						>
							{(result?.ok ?? gateway.lastTest?.succeeded) ? (
								<CircleCheck className="mt-0.5 size-4 shrink-0" />
							) : (
								<CircleAlert className="mt-0.5 size-4 shrink-0" />
							)}
							<span>{result?.message ?? gateway.lastTest?.message}</span>
						</div>
					)}
				</div>
			</Panel>

			<Panel title={t("webhook")}>
				<p className="text-muted-foreground text-sm">
					Create an endpoint with this URL in your {gateway.label} dashboard, then paste its
					signing secret above. Without it, a payment made by a customer who closes the tab
					before returning would never be recorded.
				</p>

				<div className="mt-3 flex flex-wrap items-center gap-2">
					<code className="bg-muted min-w-0 flex-1 truncate rounded-md px-3 py-2 font-mono text-xs">
						{gateway.webhookUrl}
					</code>
					<Button
						variant="outline"
						size="sm"
						onClick={async () => {
							await navigator.clipboard.writeText(gateway.webhookUrl)
							toast.success(t("webhookUrlCopied"))
						}}
					>
						<Copy />{t("copy")}</Button>
				</div>
			</Panel>

			<Panel title={t("paymentMethods")}>
				<p className="text-muted-foreground mb-4 text-sm">
					Which of {gateway.label}’s methods customers may choose. Each one also has to be
					switched on in your {gateway.label} account.
				</p>

				<div className="space-y-2">
					{gateway.methods.map((method) => {
						const enabled = gateway.enabledMethods.includes(method.code)

						return (
							<div
								key={method.code}
								className="flex items-start justify-between gap-4 rounded-md border p-3"
							>
								<div className="min-w-0">
									<div className="flex flex-wrap items-center gap-2">
										<span className="text-sm font-medium">{method.label}</span>
										{method.redirects && (
											<Badge variant="outline" className="text-muted-foreground text-xs">{t("leavesTheSite")}</Badge>
										)}
									</div>
									<p className="text-muted-foreground mt-0.5 text-xs">{method.description}</p>
								</div>

								<Switch
									checked={enabled}
									aria-label={method.label}
									onCheckedChange={(checked) =>
										patch(
											{
												provider: gatewayProvider,
												enabledMethods: checked
													? [...gateway.enabledMethods, method.code]
													: gateway.enabledMethods.filter((code) => code !== method.code),
											},
											`${method.label} ${checked ? "enabled" : "disabled"}.`
										)
									}
								/>
							</div>
						)
					})}
				</div>
			</Panel>
		</div>
	)
}
