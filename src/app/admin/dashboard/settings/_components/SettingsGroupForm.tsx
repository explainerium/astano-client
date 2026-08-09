"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { TriangleAlert } from "lucide-react"
import { toast } from "sonner"
import { z } from "zod"
import ProCheckbox from "@/components/form/ProCheckbox"
import ProColor from "@/components/form/ProColor"
import ProCombobox from "@/components/form/ProCombobox"
import ProForm from "@/components/form/ProForm"
import ProInput from "@/components/form/ProInput"
import ProSelect from "@/components/form/ProSelect"
import ProSubmit from "@/components/form/ProSubmit"
import ProTextarea from "@/components/form/ProTextarea"
import { countryOptions } from "@/constants/countries"
import { useSaveSettingsMutation } from "@/redux/api/settingApi"
import type { SettingDefinition, SettingsResponse } from "@/types/setting"

/**
 * One group of settings, on its own page.
 *
 * Saves only its own group. Splitting the screen made that both possible and
 * necessary: pressing Save on the Currency page has no business rewriting the
 * company address, and before the split every save wrote every key back
 * whether or not anyone had touched it.
 *
 * Which settings exist, what they are called and how they should be edited all
 * come from the API's registry. Adding one is an entry in settingRegistry.ts
 * and no change here.
 */

/** Long-form values that deserve more than one line. */
const MULTILINE = new Set(["invoice.footer", "email.footerText"])

/**
 * Settings with a richer control elsewhere on the page, which must not also
 * appear as a raw field. A comma-separated priority string is not something
 * anyone should have to type correctly.
 */
const HAS_OWN_CONTROL = new Set(["pricing.tierPriority"])

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

const asText = (value: unknown) => (value === null || value === undefined ? "" : String(value))

export const SettingsGroupForm = ({
	data,
	groupKey,
}: {
	data: SettingsResponse
	groupKey: string
}) => {
	const [saveSettings] = useSaveSettingsMutation()

	const stored = new Map(data.settings.map((s) => [s.key, s.value]))

	const entries = Object.entries(data.definitions).filter(
		([key, definition]) => definition.group === groupKey && !HAS_OWN_CONTROL.has(key)
	)

	const schema = z.object(
		Object.fromEntries(
			entries.map(([key, definition]) => [
				fieldName(key),
				definition.type === "boolean"
					? z.boolean()
					: definition.type === "number"
						? z.coerce.number({ message: "Enter a number" })
						: definition.type === "countries"
							? z.array(z.string())
							: z.string().trim(),
			])
		)
	)

	const defaults = Object.fromEntries(
		entries.map(([key, definition]) => {
			const value = stored.get(key) ?? definition.fallback
			return [
				fieldName(key),
				definition.type === "boolean"
					? Boolean(value)
					: definition.type === "number"
						? Number(value)
						: definition.type === "countries"
							? (Array.isArray(value) ? value : [])
							: asText(value),
			]
		})
	)

	const onSubmit = async (form: Record<string, unknown>) => {
		try {
			await saveSettings({
				settings: entries.map(([key, definition]) => ({
					key,
					value: form[fieldName(key)],
					// Straight from the registry. Whether a setting is safe to serve
					// publicly is a property of the setting, not a list this screen
					// keeps its own copy of and forgets to update.
					isPublic: definition.isPublic ?? false,
				})),
			}).unwrap()
			toast.success("Saved.")
		} catch (error) {
			const message = (error as { data?: { message?: string } })?.data?.message
			toast.error(message ?? "Could not save the settings.")
		}
	}

	const missing =
		groupKey === "company"
			? entries.filter(([key]) => !asText(stored.get(key)).trim()).length
			: 0

	const field = (key: string, definition: SettingDefinition) => {
		const name = fieldName(key)

		if (definition.type === "boolean") {
			return <ProCheckbox name={name} label={definition.label} description={definition.help} />
		}

		if (definition.type === "select") {
			return (
				<ProSelect
					name={name}
					label={definition.label}
					description={definition.help}
					options={definition.options ?? []}
				/>
			)
		}

		if (definition.type === "color") {
			return <ProColor name={name} label={definition.label} description={definition.help} />
		}

		if (definition.type === "country" || definition.type === "countries") {
			// The ISO list with localized labels already lives on this side, so the
			// registry ships the type and not two hundred options.
			return (
				<ProCombobox
					name={name}
					label={definition.label}
					description={definition.help}
					multiple={definition.type === "countries"}
					options={countryOptions("en")}
					placeholder={definition.type === "countries" ? "No countries selected" : "Choose a country"}
				/>
			)
		}

		if (MULTILINE.has(key)) {
			return <ProTextarea name={name} label={definition.label} description={definition.help} />
		}

		return (
			<ProInput
				name={name}
				type={definition.type === "number" ? "number" : "text"}
				label={definition.label}
				description={definition.help}
			/>
		)
	}

	if (!entries.length) return null

	return (
		<ProForm
			// Remounts when the group changes, so switching pages does not carry the
			// previous group's values into the new form.
			key={groupKey}
			onSubmit={onSubmit}
			resolver={zodResolver(schema)}
			defaultValues={defaults}
			className="space-y-4"
		>
			{!!missing && (
				<div className="bg-accent-soft flex items-start gap-3 rounded-lg border p-4 text-sm">
					<TriangleAlert className="text-primary mt-0.5 size-4 shrink-0" />
					<p>
						<strong>
							{missing} {missing === 1 ? "field is" : "fields are"} empty.
						</strong>{" "}
						Invoices are generated from these, so a blank one prints as a blank line on a
						document the customer keeps.
					</p>
				</div>
			)}

			<div className="bg-card rounded-lg border p-5">
				<div className="grid gap-4 sm:grid-cols-2">
					{entries.map(([key, definition]) => (
						<div
							key={key}
							className={
								MULTILINE.has(key) || definition.type === "boolean" || definition.type === "countries"
									? "sm:col-span-2"
									: undefined
							}
						>
							{field(key, definition)}
						</div>
					))}
				</div>
			</div>

			<div className="flex justify-end">
				<ProSubmit>Save</ProSubmit>
			</div>
		</ProForm>
	)
}

export default SettingsGroupForm
