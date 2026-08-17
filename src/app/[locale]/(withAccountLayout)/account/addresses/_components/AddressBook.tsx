"use client"

import { useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { z } from "zod"
import ProForm from "@/components/form/ProForm"
import ProInput from "@/components/form/ProInput"
import ProSelect from "@/components/form/ProSelect"
import ProSubmit from "@/components/form/ProSubmit"
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
	useCreateAddressMutation,
	useDeleteAddressMutation,
	useMyAddressesQuery,
	useUpdateAddressMutation,
} from "@/redux/api/storefrontApi"
import { countryName } from "@/lib/countries"
import { useSellingCountries } from "@/lib/useDeliveryCountries"
import type { SavedAddress } from "@/types/storefront"

const apiMessage = (error: unknown) => (error as { data?: { message?: string } })?.data?.message

const buildSchema = (t: (key: string) => string) =>
	z.object({
		label: z.string().trim().max(60),
		firstName: z.string().trim().min(1, t("required")).max(100),
		lastName: z.string().trim().min(1, t("required")).max(100),
		company: z.string().trim().max(200),
		street1: z.string().trim().min(1, t("required")).max(200),
		street2: z.string().trim().max(200),
		postcode: z.string().trim().min(1, t("required")).max(30),
		city: z.string().trim().min(1, t("required")).max(120),
		state: z.string().trim().max(120),
		countryCode: z.string().trim().length(2),
		phone: z.string().trim().max(50),
		email: z.union([z.literal(""), z.string().trim().email()]),
	})

type FormValues = z.infer<ReturnType<typeof buildSchema>>

const EMPTY: FormValues = {
	label: "",
	firstName: "",
	lastName: "",
	company: "",
	street1: "",
	street2: "",
	postcode: "",
	city: "",
	state: "",
	countryCode: "DE",
	phone: "",
	email: "",
}

/**
 * The address book.
 *
 * Blank optional fields are sent as `null`, not `""` — the API takes
 * `.nullable().optional()` on those, and an empty string would fail the email
 * check and store noise everywhere else.
 */
export const AddressBook = () => {
	const t = useTranslations("account")
	const tc = useTranslations("checkout")
	const tCommon = useTranslations("common")
	const locale = useLocale()

	const { data: addresses = [], isLoading } = useMyAddressesQuery()
	const [createAddress] = useCreateAddressMutation()
	const [updateAddress] = useUpdateAddressMutation()
	const [deleteAddress] = useDeleteAddressMutation()

	const [editing, setEditing] = useState<SavedAddress | "new" | null>(null)
	const [pendingDelete, setPendingDelete] = useState<SavedAddress | null>(null)

	const schema = useMemo(() => buildSchema(t), [t])

	/*
	 * The wider of the two lists, deliberately.
	 *
	 * An entry here can end up being used as a billing address, and a shop can
	 * invoice a country it will not deliver to — so restricting this to the
	 * delivery countries would leave a customer unable to save their own
	 * address. Checkout narrows the *delivery* field on its own.
	 */
	const { options: countries } = useSellingCountries()

	const onSubmit = async (form: FormValues) => {
		const optional = (value: string) => (value.trim() ? value.trim() : null)
		const payload = {
			label: optional(form.label),
			firstName: form.firstName.trim(),
			lastName: form.lastName.trim(),
			company: optional(form.company),
			street1: form.street1.trim(),
			street2: optional(form.street2),
			postcode: form.postcode.trim(),
			city: form.city.trim(),
			state: optional(form.state),
			countryCode: form.countryCode.toUpperCase(),
			phone: optional(form.phone),
			email: optional(form.email),
		}

		try {
			if (editing && editing !== "new") {
				await updateAddress({ id: editing.id, data: payload as Partial<SavedAddress> }).unwrap()
			} else {
				await createAddress(payload as Partial<SavedAddress>).unwrap()
			}
			toast.success(t("addressSaved"))
			setEditing(null)
		} catch (error) {
			toast.error(apiMessage(error) ?? t("saveFailed"))
		}
	}

	const setDefault = async (address: SavedAddress, field: "isDefaultBilling" | "isDefaultShipping") => {
		try {
			await updateAddress({ id: address.id, data: { [field]: true } }).unwrap()
		} catch (error) {
			toast.error(apiMessage(error) ?? t("saveFailed"))
		}
	}

	if (isLoading) {
		return (
			<p className="text-muted-foreground py-16 text-center text-sm">
				<Loader2 className="mr-2 inline size-4 animate-spin" />…
			</p>
		)
	}

	if (editing) {
		const current = editing === "new" ? EMPTY : { ...EMPTY, ...stripNulls(editing) }

		return (
			<div className="max-w-2xl">
				<h3 className="font-heading mb-6 text-lg font-semibold">
					{editing === "new" ? t("addAddress") : t("editAddress")}
				</h3>

				<ProForm
					onSubmit={onSubmit}
					resolver={zodResolver(schema)}
					defaultValues={current}
					className="space-y-5"
				>
					<ProInput name="label" label={t("addressLabel")} description={t("addressLabelHint")} />

					<div className="grid gap-5 sm:grid-cols-2">
						<ProInput name="firstName" label={tc("firstName")} required />
						<ProInput name="lastName" label={tc("lastName")} required />
						<div className="sm:col-span-2">
							<ProInput name="company" label={tc("company")} />
						</div>
						<div className="sm:col-span-2">
							<ProInput name="street1" label={tc("street1")} required />
						</div>
						<div className="sm:col-span-2">
							<ProInput name="street2" label={tc("street2")} />
						</div>
						<ProInput name="postcode" label={tc("postcode")} required />
						<ProInput name="city" label={tc("city")} required />
						<ProSelect name="countryCode" label={tc("country")} options={countries} required />
						<ProInput name="state" label={tc("state")} />
						<ProInput name="phone" type="tel" label={tc("phone")} />
						<ProInput name="email" type="email" label={tc("email")} />
					</div>

					<div className="flex gap-3">
						<ProSubmit pendingLabel={t("saving")} className="rounded-none uppercase">
							{t("save")}
						</ProSubmit>
						<button
							type="button"
							onClick={() => setEditing(null)}
							className="border px-6 py-2 text-sm font-semibold tracking-wide uppercase transition-colors hover:border-neutral-400"
						>
							{tCommon("cancel")}
						</button>
					</div>
				</ProForm>
			</div>
		)
	}

	return (
		<>
			<div className="mb-6 flex items-center justify-between gap-4">
				<h2 className="font-heading text-2xl font-extrabold tracking-tight">
					{t("addressesTitle")}
				</h2>
				<button
					type="button"
					onClick={() => setEditing("new")}
					className="bg-primary text-primary-foreground inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold tracking-wide uppercase transition-opacity hover:opacity-90"
				>
					<Plus className="size-4" />
					{t("addAddress")}
				</button>
			</div>

			{!addresses.length ? (
				<p className="text-muted-foreground py-16 text-center text-sm">{t("noAddresses")}</p>
			) : (
				<ul className="grid gap-4 sm:grid-cols-2">
					{addresses.map((address) => (
						<li key={address.id} className="flex flex-col border p-5">
							{address.label && (
								<p className="text-muted-foreground mb-1 text-xs uppercase">{address.label}</p>
							)}

							<address className="flex-1 text-sm not-italic">
								<span className="font-medium">
									{address.firstName} {address.lastName}
								</span>
								{address.company && (
									<>
										<br />
										{address.company}
									</>
								)}
								<br />
								{address.street1}
								{address.street2 && (
									<>
										<br />
										{address.street2}
									</>
								)}
								<br />
								{address.postcode} {address.city}
								<br />
								{countryName(address.countryCode, locale)}
							</address>

							<div className="mt-3 flex flex-wrap gap-2">
								{address.isDefaultBilling && (
									<span className="bg-muted px-2 py-1 text-xs">{t("defaultBilling")}</span>
								)}
								{address.isDefaultShipping && (
									<span className="bg-muted px-2 py-1 text-xs">{t("defaultShipping")}</span>
								)}
							</div>

							<div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
								<button
									type="button"
									onClick={() => setEditing(address)}
									className="hover:text-primary inline-flex items-center gap-1.5 transition-colors"
								>
									<Pencil className="size-3.5" />
									{tCommon("edit")}
								</button>
								<button
									type="button"
									onClick={() => setPendingDelete(address)}
									className="text-muted-foreground hover:text-destructive inline-flex items-center gap-1.5 transition-colors"
								>
									<Trash2 className="size-3.5" />
									{t("deleteAddress")}
								</button>

								{!address.isDefaultBilling && (
									<button
										type="button"
										onClick={() => setDefault(address, "isDefaultBilling")}
										className="text-muted-foreground hover:text-primary ml-auto text-xs underline underline-offset-2"
									>
										{t("setDefaultBilling")}
									</button>
								)}
								{!address.isDefaultShipping && (
									<button
										type="button"
										onClick={() => setDefault(address, "isDefaultShipping")}
										className="text-muted-foreground hover:text-primary text-xs underline underline-offset-2"
									>
										{t("setDefaultShipping")}
									</button>
								)}
							</div>
						</li>
					))}
				</ul>
			)}

			<AlertDialog open={Boolean(pendingDelete)} onOpenChange={(open) => !open && setPendingDelete(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>{t("deleteAddress")}</AlertDialogTitle>
						<AlertDialogDescription>{t("deleteAddressConfirm")}</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
						<AlertDialogAction
							onClick={async () => {
								if (!pendingDelete) return
								try {
									await deleteAddress(pendingDelete.id).unwrap()
									toast.success(t("addressDeleted"))
								} catch (error) {
									toast.error(apiMessage(error) ?? t("saveFailed"))
								} finally {
									setPendingDelete(null)
								}
							}}
						>
							{tCommon("confirm")}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	)
}

/** The API returns nulls; the form wants empty strings. */
const stripNulls = (address: SavedAddress) =>
	Object.fromEntries(
		Object.entries(address).map(([key, value]) => [key, value === null ? "" : value])
	) as Partial<FormValues>

export default AddressBook
