"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useFormContext } from "react-hook-form"
import { Loader2, Plus } from "lucide-react"
import ProCombobox, { type ProComboboxOption } from "@/components/form/ProCombobox"
import { Button } from "@/components/ui/button"
import { useCreateCategoryMutation } from "@/redux/api/categoryApi"

/**
 * The product's categories, with a way to make a missing one on the spot.
 *
 * Asked for alongside typing a new attribute value: a category that does not
 * exist yet meant leaving a half-filled product for the Categories page. A
 * category needs one more thing than a value does — where it sits — so typing
 * a name opens a small form with the parent beside it, rather than creating it
 * outright at the top level.
 *
 * Both languages get the typed name; the English and everything else (image,
 * description, SEO) is finished on the Categories page.
 */
export const CategoryPicker = ({ options }: { options: ProComboboxOption[] }) => {
	const t = useTranslations("admin")
	const { getValues, setValue } = useFormContext()
	const [createCategory, { isLoading }] = useCreateCategoryMutation()

	/** Null: the form is closed. A string: open, holding the name typed so far. */
	const [draft, setDraft] = useState<string | null>(null)
	const [parentId, setParentId] = useState("")
	const [error, setError] = useState<string | null>(null)

	const open = (name: string) => {
		setDraft(name)
		setParentId("")
		setError(null)
	}

	const save = async () => {
		const name = (draft ?? "").trim()
		if (!name) return
		setError(null)

		try {
			const created = await createCategory({
				parentId: parentId || null,
				translations: [
					{ locale: "de", name },
					{ locale: "en", name },
				],
			}).unwrap()

			const current = (getValues("categoryIds") as string[] | undefined) ?? []
			setValue("categoryIds", [...current, created.id], { shouldDirty: true })
			setDraft(null)
		} catch (failure) {
			setError(
				(failure as { data?: { message?: string } })?.data?.message ?? t("couldNotCreateCategory")
			)
		}
	}

	return (
		<div className="space-y-3">
			<ProCombobox
				name="categoryIds"
				multiple
				options={options}
				placeholder={t("noCategories")}
				searchPlaceholder={t("searchOrTypeNewCategory")}
				// Opens the form rather than creating: the parent is still to choose.
				onCreate={async (text) => {
					open(text)
					return null
				}}
				createLabel={(text) => t("addNewCategory", { name: text })}
			/>

			{draft === null ? (
				<Button type="button" variant="outline" size="sm" onClick={() => open("")}>
					<Plus />
					{t("newCategory")}
				</Button>
			) : (
				<div className="bg-muted/40 space-y-3 rounded-lg border p-3">
					<label className="block space-y-1 text-xs">
						<span className="font-medium">{t("categoryName")}</span>
						<input
							autoFocus
							value={draft}
							onChange={(event) => setDraft(event.target.value)}
							onKeyDown={(event) => {
								// Enter inside the product form would submit the product.
								if (event.key === "Enter") {
									event.preventDefault()
									void save()
								}
							}}
							className="border-input focus-visible:border-ring bg-background h-9 w-full rounded-md border px-2 text-sm outline-none"
						/>
					</label>

					<label className="block space-y-1 text-xs">
						<span className="font-medium">{t("parentCategory")}</span>
						<select
							value={parentId}
							onChange={(event) => setParentId(event.target.value)}
							className="border-input focus-visible:border-ring bg-background h-9 w-full rounded-md border px-2 text-sm outline-none"
						>
							<option value="">{t("noParentTopLevel")}</option>
							{options.map((option) => (
								<option key={option.value} value={option.value}>
									{option.label}
								</option>
							))}
						</select>
					</label>

					<p className="text-muted-foreground text-xs">{t("newCategoryHint")}</p>

					{error && <p className="text-destructive text-xs">{error}</p>}

					<div className="flex gap-2">
						<Button type="button" size="sm" disabled={isLoading || !draft.trim()} onClick={save}>
							{isLoading && <Loader2 className="size-3.5 animate-spin" />}
							{t("createCategory")}
						</Button>
						<Button
							type="button"
							variant="ghost"
							size="sm"
							disabled={isLoading}
							onClick={() => setDraft(null)}
						>
							{t("cancel")}
						</Button>
					</div>
				</div>
			)}
		</div>
	)
}

export default CategoryPicker
