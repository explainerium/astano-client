"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import { z } from "zod"
import ProCheckbox from "@/components/form/ProCheckbox"
import ProCombobox from "@/components/form/ProCombobox"
import ProForm from "@/components/form/ProForm"
import ProInput from "@/components/form/ProInput"
import ProSubmit from "@/components/form/ProSubmit"
import ProTextarea from "@/components/form/ProTextarea"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useCreateCategoryMutation, useUpdateCategoryMutation } from "@/redux/api/categoryApi"
import type { AdminCategory, CategoryTranslation } from "@/types/catalog"
import CategoryAssetField from "./CategoryAssetField"
import CategoryTiersPanel from "./CategoryTiersPanel"
import { descendantIds, translationFor } from "./categoryTree"

/**
 * The category editor.
 *
 * On its own page rather than in a dialog. A category carries two languages, a
 * parent, flags, two pictures and a price ladder — that is a screen, and a
 * screen in a modal cannot be linked to, cannot be reloaded, and loses
 * everything typed into it if the overlay is clicked.
 */

/**
 * Locales the editor offers, in order. The first is the primary and is the one
 * that must be filled in — the API falls back to it when a translation is
 * missing, so a category without it would render as whatever language happens
 * to exist.
 */
const EDITOR_LOCALES = [
	{ code: "en", label: "English" },
	{ code: "de", label: "Deutsch" },
] as const

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const slugField = z
	.string()
	.trim()
	.refine((value) => value === "" || SLUG_PATTERN.test(value), {
		message: "Lowercase words separated by hyphens",
	})

/** An id, cleared, or untouched. Nullable and optional mean different things here. */
const assetField = z.string().nullable()

const schema = z.object({
	parentId: z.string(),
	// Not z.coerce: ProInput's number handling already yields a real number, and
	// coerce would make zod's input and output types diverge so the resolver no
	// longer matches the form's value type.
	sortOrder: z.number({ message: "Enter a number" }).int().min(0),
	isHidden: z.boolean(),
	isOptionCategory: z.boolean(),
	imageAssetId: assetField,
	iconAssetId: assetField,
	// Preview URLs. Carried in the form so the thumbnail and the id it stands
	// for can never drift apart; never sent.
	imagePreview: z.string(),
	iconPreview: z.string(),
	en: z.object({
		name: z.string().trim().min(1, "An English name is required"),
		slug: slugField,
		description: z.string().trim(),
	}),
	de: z.object({
		name: z.string().trim(),
		slug: slugField,
		description: z.string().trim(),
	}),
})

type FormValues = z.infer<typeof schema>

const NO_PARENT = "__none__"

const toDefaults = (category?: AdminCategory): FormValues => ({
	parentId: category?.parentId ?? NO_PARENT,
	sortOrder: category?.sortOrder ?? 0,
	isHidden: category?.isHidden ?? false,
	isOptionCategory: category?.isOptionCategory ?? false,
	imageAssetId: category?.imageAssetId ?? null,
	iconAssetId: category?.iconAssetId ?? null,
	// Smallest derivative that exists — this is a thumbnail, and an original
	// banner can be several megabytes.
	imagePreview: category?.image?.srcset.thumb ?? category?.image?.url ?? "",
	iconPreview: category?.icon?.srcset.thumb ?? category?.icon?.url ?? "",
	en: {
		name: translationFor(category, "en")?.name ?? "",
		slug: translationFor(category, "en")?.slug ?? "",
		description: translationFor(category, "en")?.description ?? "",
	},
	de: {
		name: translationFor(category, "de")?.name ?? "",
		slug: translationFor(category, "de")?.slug ?? "",
		description: translationFor(category, "de")?.description ?? "",
	},
})

export const CategoryForm = ({
	category,
	allCategories,
}: {
	/** Absent when creating. */
	category?: AdminCategory
	allCategories: AdminCategory[]
}) => {
	const router = useRouter()
	const [createCategory] = useCreateCategoryMutation()
	const [updateCategory] = useUpdateCategoryMutation()
	const [activeLocale, setActiveLocale] = useState<string>(EDITOR_LOCALES[0].code)

	const isEdit = !!category

	/**
	 * A category cannot be its own parent, nor a child of its own descendant —
	 * that would orphan the whole branch from the tree.
	 */
	const excluded = category
		? new Set([category.id, ...descendantIds(allCategories, category.id)])
		: new Set<string>()

	const parentOptions = [
		{ label: "— No parent (top level) —", value: NO_PARENT },
		...allCategories
			.filter((c) => !excluded.has(c.id))
			.map((c) => ({
				label: translationFor(c, "en")?.name ?? c.translations[0]?.name ?? "(untitled)",
				value: c.id,
			}))
			.sort((a, b) => a.label.localeCompare(b.label)),
	]

	const onSubmit = async (values: FormValues) => {
		const translations: CategoryTranslation[] = []

		for (const { code } of EDITOR_LOCALES) {
			const entry = values[code as "en" | "de"]
			// A locale with no name is simply not sent. Sending an empty one would
			// create a translation row that renders as a blank category name.
			if (!entry.name.trim()) continue

			translations.push({
				locale: code,
				name: entry.name.trim(),
				...(entry.slug.trim() ? { slug: entry.slug.trim() } : {}),
				...(entry.description.trim() ? { description: entry.description.trim() } : {}),
			})
		}

		const payload = {
			parentId: values.parentId === NO_PARENT ? null : values.parentId,
			sortOrder: values.sortOrder,
			isHidden: values.isHidden,
			isOptionCategory: values.isOptionCategory,
			// Sent even when null, which is how a picture gets removed.
			imageAssetId: values.imageAssetId || null,
			iconAssetId: values.iconAssetId || null,
			translations,
		}

		try {
			if (isEdit) {
				await updateCategory({ id: category.id, data: payload }).unwrap()
				toast.success("Category updated.")
			} else {
				const created = await createCategory(payload).unwrap()
				toast.success("Category created.")
				// Straight into the editor for the thing just made, so the price
				// ladders below become reachable without hunting for it in the list.
				router.replace(`/admin/dashboard/categories/${created.id}/edit`)
				return
			}
		} catch (error) {
			// The API's message is already a readable sentence — it names the
			// offending SKU or the blocking relation rather than leaking Prisma.
			const message = (error as { data?: { message?: string } })?.data?.message
			toast.error(message ?? "Could not save the category.")
		}
	}

	return (
		<div className="space-y-6">
			<div>
				<Link
					href="/admin/dashboard/categories"
					className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
				>
					<ArrowLeft className="size-4" />
					All categories
				</Link>

				<h1 className="mt-2 text-xl font-semibold">
					{isEdit
						? (translationFor(category, "en")?.name ?? "Edit category")
						: "New category"}
				</h1>
				<p className="text-muted-foreground mt-1 text-sm">
					The English name is required. German is optional, but a category without it falls back
					to English on the German site.
				</p>
			</div>

			<ProForm
				// Keyed on the category so navigating between two edit pages rebuilds
				// the form — useForm only reads defaultValues once.
				key={category?.id ?? "new"}
				onSubmit={onSubmit}
				resolver={zodResolver(schema)}
				defaultValues={toDefaults(category)}
				className="space-y-6"
			>
				<div className="bg-card rounded-lg border p-5">
					<Tabs value={activeLocale} onValueChange={setActiveLocale}>
						<TabsList>
							{EDITOR_LOCALES.map(({ code, label }) => {
								const filled = !!translationFor(category, code)?.name
								return (
									<TabsTrigger key={code} value={code} className="gap-2">
										{label}
										{isEdit && !filled && (
											<Badge variant="secondary" className="text-[10px]">
												empty
											</Badge>
										)}
									</TabsTrigger>
								)
							})}
						</TabsList>

						{EDITOR_LOCALES.map(({ code }) => (
							<TabsContent key={code} value={code} className="space-y-4 pt-4">
								<ProInput name={`${code}.name`} label="Name" required={code === "en"} />
								<ProInput
									name={`${code}.slug`}
									label="Slug"
									description="Leave empty to generate it from the name. German umlauts become ue, oe, ae."
								/>
								<ProTextarea name={`${code}.description`} label="Description" rows={3} />
							</TabsContent>
						))}
					</Tabs>
				</div>

				<div className="bg-card space-y-5 rounded-lg border p-5">
					<h2 className="font-heading text-base font-semibold">Pictures</h2>

					<CategoryAssetField
						name="imageAssetId"
						previewName="imagePreview"
						label="Category image"
						description="Optional. The banner on the category's own page and in a category grid."
						pickerTitle="Category image"
					/>

					<CategoryAssetField
						name="iconAssetId"
						previewName="iconPreview"
						label="Icon"
						description="Optional. A small mark for menus and filter lists, where the banner would be too detailed to read. A square SVG or PNG works best."
						pickerTitle="Category icon"
						square
					/>
				</div>

				<div className="bg-card space-y-4 rounded-lg border p-5">
					<h2 className="font-heading text-base font-semibold">Placement</h2>

					<ProCombobox name="parentId" label="Parent category" options={parentOptions} />
					<ProInput
						name="sortOrder"
						type="number"
						label="Sort order"
						description="Lower numbers appear first among siblings."
					/>
					<ProCheckbox
						name="isHidden"
						label="Hidden"
						description="Removed from every list, filter and menu, and its page returns 404."
					/>
					<ProCheckbox
						name="isOptionCategory"
						label="Option category"
						description="Holds add-ons sold through the configurator rather than on their own."
					/>
				</div>

				<div className="flex justify-end gap-2">
					<Button asChild type="button" variant="ghost">
						<Link href="/admin/dashboard/categories">Cancel</Link>
					</Button>
					<ProSubmit>{isEdit ? "Save changes" : "Create category"}</ProSubmit>
				</div>
			</ProForm>

			{/*
			 * Outside the form, and only once the category exists.
			 *
			 * Ladders are a separate resource with their own endpoint and their own
			 * save — folding them into this form would mean one button that writes
			 * to two places and half-succeeds. A new category has no id to hang them
			 * on yet, so they appear once it has been created.
			 */}
			{isEdit && category && (
				<div className="bg-card rounded-lg border p-5">
					<CategoryTiersPanel categoryId={category.id} />
				</div>
			)}
		</div>
	)
}

export default CategoryForm
