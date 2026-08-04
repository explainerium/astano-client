"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, TriangleAlert } from "lucide-react"
import { toast } from "sonner"
import { z } from "zod"
import ProForm from "@/components/form/ProForm"
import ProInput from "@/components/form/ProInput"
import ProSubmit from "@/components/form/ProSubmit"
import ProTextarea from "@/components/form/ProTextarea"
import { useSaveSettingsMutation, useSettingsQuery } from "@/redux/api/settingApi"
import type { SettingsResponse } from "@/types/setting"

/**
 * Sections, in the order they matter. Keys not listed here still render, under
 * "Other" — the catalogue comes from the API, so a key added on the backend
 * appears without a change on this side.
 */
const SECTIONS = [
	{
		prefix: "company.",
		title: "Company",
		blurb:
			"Printed on every invoice and in the footer of every email. Empty on the live WordPress site, so all of it has to come from the client.",
	},
	{
		prefix: "invoice.",
		title: "Invoices",
		blurb: "Applies to generated invoice PDFs.",
	},
	{
		prefix: "mail.",
		title: "Email",
		blurb: "Who outgoing mail comes from, and where order notifications land.",
	},
] as const

/**
 * The four the storefront footer needs. Marked public on save so
 * `GET /settings/public` can serve them; everything else stays staff-only,
 * because a VAT number or a notification inbox has no business being fetchable
 * by anyone who loads the shop.
 */
const PUBLIC_KEYS = new Set([
	"company.name",
	"company.email",
	"company.phone",
	"company.website",
])

/** Long-form values that deserve more than one line. */
const MULTILINE = new Set(["invoice.footer"])

const asString = (value: unknown) =>
	value === null || value === undefined ? "" : String(value)

const groupKeys = (known: Record<string, string>) => {
	const keys = Object.keys(known)
	const grouped = SECTIONS.map((section) => ({
		...section,
		keys: keys.filter((key) => key.startsWith(section.prefix)),
	}))

	const claimed = new Set(grouped.flatMap((g) => g.keys))
	const rest = keys.filter((key) => !claimed.has(key))

	return rest.length
		? [...grouped, { prefix: "", title: "Other", blurb: "", keys: rest }]
		: grouped
}

/**
 * Setting keys are dotted; react-hook-form field names must not be.
 *
 * RHF reads a dot as a nested path, so `name="company.website"` writes to
 * `values.company.website` while `defaultValues` holds the flat key
 * `"company.website"`. Its internal `get` falls back to the flat key, so the
 * fields *look* right and even type correctly — but the submitted object still
 * carries the untouched flat value, and every edit is silently discarded on
 * save. Swapping the dot for a separator RHF does not parse keeps the two in
 * one place.
 */
const fieldName = (key: string) => key.split(".").join("__")

/** Turns "company.vatId" into "Vat id" for the field label. */
const labelFor = (key: string) => {
	const tail = key.split(".").pop() ?? key
	const spaced = tail.replace(/([A-Z])/g, " $1").toLowerCase()
	return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

const SettingsForm = ({ data }: { data: SettingsResponse }) => {
	const [saveSettings] = useSaveSettingsMutation()

	const sections = groupKeys(data.known)
	const current = new Map(data.settings.map((s) => [s.key, s]))
	const keys = sections.flatMap((s) => s.keys)

	// Every key is a plain string field. The store has no numeric or boolean
	// settings yet; when it does, this is where the type would be declared.
	const schema = z.object(
		Object.fromEntries(keys.map((key) => [fieldName(key), z.string().trim()]))
	)

	const defaults = Object.fromEntries(
		keys.map((key) => [fieldName(key), asString(current.get(key)?.value)])
	)

	const onSubmit = async (form: Record<string, string>) => {
		try {
			await saveSettings({
				settings: keys.map((key) => ({
					key,
					value: form[fieldName(key)]?.trim() ?? "",
					isPublic: PUBLIC_KEYS.has(key),
				})),
			}).unwrap()
			toast.success("Settings saved.")
		} catch (error) {
			const message = (error as { data?: { message?: string } })?.data?.message
			toast.error(message ?? "Could not save the settings.")
		}
	}

	const missingCompany = sections
		.find((s) => s.prefix === "company.")
		?.keys.filter((key) => !asString(current.get(key)?.value).trim()).length

	return (
		<ProForm
			onSubmit={onSubmit}
			resolver={zodResolver(schema)}
			defaultValues={defaults}
			className="space-y-4"
		>
			{!!missingCompany && (
				<div className="bg-accent-soft flex items-start gap-3 rounded-lg border p-4 text-sm">
					<TriangleAlert className="text-primary mt-0.5 size-4 shrink-0" />
					<p>
						<strong>
							{missingCompany} company {missingCompany === 1 ? "field is" : "fields are"}{" "}
							empty.
						</strong>{" "}
						Invoices are generated from these, so a blank one prints as a blank
						line on a document the customer keeps.
					</p>
				</div>
			)}

			{sections.map((section) =>
				section.keys.length ? (
					<section key={section.title} className="bg-card rounded-lg border">
						<header className="border-b px-5 py-3">
							<h2 className="font-heading text-sm font-semibold">{section.title}</h2>
							{section.blurb && (
								<p className="text-muted-foreground mt-1 max-w-prose text-xs">
									{section.blurb}
								</p>
							)}
						</header>

						<div className="grid gap-4 p-5 sm:grid-cols-2">
							{section.keys.map((key) => (
								<div
									key={key}
									className={MULTILINE.has(key) ? "sm:col-span-2" : undefined}
								>
									{MULTILINE.has(key) ? (
										<ProTextarea
											name={fieldName(key)}
											label={labelFor(key)}
											description={data.known[key]}
										/>
									) : (
										<ProInput
											name={fieldName(key)}
											label={labelFor(key)}
											description={data.known[key]}
										/>
									)}
								</div>
							))}
						</div>
					</section>
				) : null
			)}

			<div className="flex items-center justify-between gap-4">
				<p className="text-muted-foreground text-xs">
					Shop name, email, phone and website are served to the storefront. The
					rest stays staff-only.
				</p>
				<ProSubmit>Save settings</ProSubmit>
			</div>
		</ProForm>
	)
}

export default function SettingsPage() {
	const { data, isLoading, isError, error } = useSettingsQuery()

	return (
		<div className="space-y-4">
			{isLoading && (
				<div className="bg-card text-muted-foreground flex items-center justify-center gap-2 rounded-lg border p-16 text-sm">
					<Loader2 className="size-4 animate-spin" />
					Loading settings…
				</div>
			)}

			{isError && (
				<div className="text-destructive bg-card rounded-lg border border-dashed p-16 text-center text-sm">
					{(error as { data?: { message?: string } })?.data?.message ??
						"Could not load settings."}
				</div>
			)}

			{/* Keyed on the loaded values so useForm rebuilds once they arrive — it
			    reads defaultValues only on mount. */}
			{data && <SettingsForm key={data.settings.length} data={data} />}
		</div>
	)
}
