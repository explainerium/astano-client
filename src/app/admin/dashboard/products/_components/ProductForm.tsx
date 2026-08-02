"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import { z } from "zod"
import ProCheckbox from "@/components/form/ProCheckbox"
import ProCombobox from "@/components/form/ProCombobox"
import ProForm from "@/components/form/ProForm"
import ProInput from "@/components/form/ProInput"
import ProSelect from "@/components/form/ProSelect"
import ProSubmit from "@/components/form/ProSubmit"
import ProPermalink from "@/components/form/ProPermalink"
import ProRichText from "@/components/form/ProRichText"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAdminCategoriesQuery } from "@/redux/api/categoryApi"
import { useCreateProductMutation, useUpdateProductMutation } from "@/redux/api/productApi"
import type {
	AdminProduct,
	PriceRole,
	ProductPayload,
	ProductPrice,
	ProductTier,
} from "@/types/product"
import AttributesTab from "./AttributesTab"
import MoqField from "./MoqField"
import OptionsTab from "./OptionsTab"
import ProductImages from "./ProductImages"
import QuantityPricing from "./QuantityPricing"
import {
	buildTree,
	displayName,
	flattenTree,
} from "../../categories/_components/categoryTree"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"

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

/** Empty, or a plain decimal. Matches the API's own money regex. */
const moneyField = z
	.string()
	.trim()
	.refine((value) => value === "" || /^\d+(\.\d{1,4})?$/.test(value), {
		message: "Use a number like 12.50",
	})

const priceFields = z.object({ basePrice: moneyField, salePrice: moneyField })

/** Empty, or a decimal with up to three places — the column is Decimal(10,3). */
const weightField = z
	.string()
	.trim()
	.refine((value) => value === "" || /^\d+(\.\d{1,3})?$/.test(value), {
		message: "Use a number like 0.25",
	})

/** Empty, or a decimal with up to two places — the columns are Decimal(10,2). */
const sizeField = z
	.string()
	.trim()
	.refine((value) => value === "" || /^\d+(\.\d{1,2})?$/.test(value), {
		message: "Use a number like 12.5",
	})

/**
 * One rung of the ladder, both prices side by side.
 *
 * The amount *is* the unit price at that quantity — every tier in the live shop
 * is a fixed price (§4.2), so there is no discount-type column to get wrong.
 */
const tierRow = z.object({
	minQuantity: z.number({ message: "Enter a quantity" }).int().min(1, "At least 1"),
	retail: moneyField,
	reseller: moneyField,
})

const localeBlock = (nameRequired: boolean) =>
	z.object({
		name: nameRequired
			? z.string().trim().min(1, "An English name is required")
			: z.string().trim(),
		slug: slugField,
		shortDescription: z.string().trim(),
		description: z.string().trim(),
	})

const schema = z.object({
	en: localeBlock(true),
	de: localeBlock(false),

	// General
	status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
	visibility: z.enum(["SHOP_AND_SEARCH", "SHOP_ONLY", "SEARCH_ONLY", "HIDDEN"]),
	kind: z.enum(["MAIN", "OPTION"]),
	quoteEnabled: z.boolean(),
	moq: z.number({ message: "Enter a number" }).int().min(0),
	sortOrder: z.number({ message: "Enter a number" }).int().min(0),
	categoryIds: z.array(z.string()),

	// Media. Ids only — the thumbnails to draw them with live in the panel's
	// own state, because the API takes ids and nothing else.
	featuredAssetId: z.string().nullable(),
	assetIds: z.array(z.string()),

	// Inventory — the API requires at least one variant, and SKU is mandatory on
	// it, so a product cannot be created without these two.
	sku: z.string().trim().min(1, "A SKU is required").max(100),
	manageStock: z.boolean(),
	stock: z.number({ message: "Enter a number" }).int().min(0),
	allowBackorder: z.boolean(),

	// Shipping. Stored on the default variant alongside SKU and stock, so a
	// simple product keeps them in exactly one place. Empty means "not set",
	// and the cart counts an unset weight as 0 kg when it picks a rate band.
	weightKg: weightField,
	lengthCm: sizeField,
	widthCm: sizeField,
	heightCm: sizeField,

	// Pricing. Money stays a string all the way to the API — these are
	// Decimal(12,4) and a float would lose cents on the way through.
	//
	// Two rows, not three. Retail is written to GUEST because that is where
	// resolvePrice()'s fallback chain terminates: a signed-in customer with no
	// B2C row of their own lands on it, and so does a Reseller who is still
	// awaiting approval (R5b). So one retail price covers both, and the second
	// row is the dealer price.
	prices: z.object({
		GUEST: priceFields,
		RESELLER: priceFields,
	}),
	taxStatus: z.enum(["TAXABLE", "SHIPPING_ONLY", "NONE"]),

	tiers: z.array(tierRow),

	attributes: z.array(
		z.object({
			attributeId: z.string().min(1, "Choose an attribute"),
			attributeValueIds: z.array(z.string()).min(1, "Choose at least one value"),
			isVisible: z.boolean(),
			isVariation: z.boolean(),
		})
	),

	options: z.array(
		z.object({
			optionProductId: z.string().min(1, "Choose a product"),
			groupLabel: z.string().trim().max(120),
			sortOrder: z.number({ message: "Enter a number" }).int().min(0),
			preselected: z.boolean(),
		})
	),
})
	.superRefine((values, ctx) => {
		const regular = values.prices.GUEST.basePrice.trim()
		const dealer = values.prices.RESELLER.basePrice.trim()
		const rows = values.tiers

		// A ladder with nothing to step down from is dead data: the rungs attach
		// to the price row of their own role, and a role with no row is never
		// resolved at all. A dealer ladder can stand on the dealer price alone,
		// which is why this is not simply "any ladder needs a regular price".
		const needsRegular =
			rows.some((row) => row.retail.trim()) ||
			(!dealer && rows.some((row) => row.reseller.trim()))

		if (!regular && needsRegular) {
			ctx.addIssue({
				code: "custom",
				path: ["prices", "GUEST", "basePrice"],
				message: "Set a regular price before adding quantity discounts.",
			})
		}

		// Two rungs at the same quantity: which one wins is undefined, since the
		// resolver picks by highest threshold and both are equally high.
		const seen = new Map<number, number>()
		rows.forEach((row, index) => {
			const first = seen.get(row.minQuantity)
			if (first === undefined) {
				seen.set(row.minQuantity, index)
				return
			}
			ctx.addIssue({
				code: "custom",
				path: ["tiers", index, "minQuantity"],
				message: `Row ${first + 1} already covers ${row.minQuantity}.`,
			})
		})

		// §4.2 found a live product whose Reseller ladder went *up* at 1000 —
		// order more, pay more per unit. This is the validation that note asks
		// for. The base price seeds the comparison, so a first rung above the
		// regular price is caught as the same mistake.
		const ordered = [...rows]
			.map((row, index) => ({ row, index }))
			.sort((a, b) => a.row.minQuantity - b.row.minQuantity)

		const ladders = [
			{ column: "retail" as const, floor: regular },
			{ column: "reseller" as const, floor: dealer || regular },
		]

		for (const { column, floor } of ladders) {
			let previous = floor ? Number(floor) : null
			for (const { row, index } of ordered) {
				const amount = row[column].trim()
				if (!amount) continue
				const value = Number(amount)
				if (previous !== null && value > previous) {
					ctx.addIssue({
						code: "custom",
						path: ["tiers", index, column],
						message: `Above the ${previous} charged for a smaller order.`,
					})
				}
				previous = value
			}
		}
	})

type FormValues = z.infer<typeof schema>

const translationFor = (product: AdminProduct | undefined, locale: string) =>
	product?.translations.find((t) => t.locale === locale)

const priceBlock = (row?: ProductPrice) => ({
	basePrice: row?.basePrice ?? "",
	salePrice: row?.salePrice ?? "",
})

/** Retail lives on GUEST. A product saved before this screen may carry it on B2C. */
const retailPrice = (product?: AdminProduct) =>
	product?.prices.find((p) => p.role === "GUEST") ?? product?.prices.find((p) => p.role === "B2C")

/**
 * The flat (role, quantity) rows folded back into one row per quantity.
 *
 * Only fixed-price rungs are read. The value of a percentage rung is a
 * percentage, and showing it in a column headed "price" would invite an admin
 * to save it as one. Nothing in the catalogue uses the other two types (§4.2).
 */
const toTierRows = (product?: AdminProduct) => {
	const fixed = (product?.tiers ?? []).filter((tier) => tier.type === "FIXED_PRICE")

	const valueAt = (role: PriceRole, minQuantity: number) =>
		fixed.find((tier) => tier.role === role && tier.minQuantity === minQuantity)?.value ?? ""

	return [...new Set(fixed.map((tier) => tier.minQuantity))]
		.sort((a, b) => a - b)
		.map((minQuantity) => ({
			minQuantity,
			retail: valueAt("GUEST", minQuantity) || valueAt("B2C", minQuantity),
			reseller: valueAt("RESELLER", minQuantity),
		}))
}

const toDefaults = (product?: AdminProduct): FormValues => {
	const variant = product?.variants.find((v) => v.isDefault) ?? product?.variants[0]

	const block = (locale: string) => ({
		name: translationFor(product, locale)?.name ?? "",
		slug: translationFor(product, locale)?.slug ?? "",
		shortDescription: translationFor(product, locale)?.shortDescription ?? "",
		description: translationFor(product, locale)?.description ?? "",
	})

	return {
		en: block("en"),
		de: block("de"),
		status: product?.status ?? "DRAFT",
		visibility: product?.visibility ?? "SHOP_AND_SEARCH",
		kind: product?.kind ?? "MAIN",
		quoteEnabled: product?.quoteEnabled ?? false,
		moq: product?.moq ?? 0,
		sortOrder: product?.sortOrder ?? 0,
		categoryIds: product?.categoryIds ?? [],
		featuredAssetId: product?.featuredAssetId ?? null,
		assetIds: product?.assetIds ?? [],
		sku: variant?.sku ?? "",
		manageStock: variant?.manageStock ?? true,
		stock: variant?.stock ?? 0,
		allowBackorder: variant?.allowBackorder ?? false,

		weightKg: variant?.weightKg ?? "",
		lengthCm: variant?.lengthCm ?? "",
		widthCm: variant?.widthCm ?? "",
		heightCm: variant?.heightCm ?? "",

		prices: {
			GUEST: priceBlock(retailPrice(product)),
			RESELLER: priceBlock(product?.prices.find((p) => p.role === "RESELLER")),
		},
		taxStatus: product?.taxStatus ?? "TAXABLE",
		tiers: toTierRows(product),

		attributes: (product?.attributes ?? []).map((attribute) => ({
			attributeId: attribute.attributeId,
			attributeValueIds: attribute.attributeValueIds,
			isVisible: attribute.isVisible,
			isVariation: attribute.isVariation,
		})),

		options: (product?.options ?? []).map((option, index) => ({
			optionProductId: option.optionProductId,
			groupLabel: option.groupLabel ?? "",
			sortOrder: option.sortOrder ?? index,
			preselected: option.preselected ?? false,
		})),
	}
}

export const ProductForm = ({ product }: { product?: AdminProduct }) => {
	const router = useRouter()
	const [createProduct] = useCreateProductMutation()
	const [updateProduct] = useUpdateProductMutation()
	const [activeLocale, setActiveLocale] = useState<string>(EDITOR_LOCALES[0].code)

	const isEdit = !!product

	const { data: rawCategories = [] } = useAdminCategoriesQuery()
	const categoryOptions = flattenTree(buildTree(rawCategories)).map((category) => ({
		value: category.id,
		// Non-breaking spaces: the combobox renders labels as plain text.
		label: `${"  ".repeat(category.depth)}${category.depth > 0 ? "— " : ""}${displayName(category)}`,
		keywords: [displayName(category)],
	}))

	const onSubmit = async (form: FormValues) => {
		const translations = EDITOR_LOCALES.flatMap(({ code }) => {
			const block = form[code as "en" | "de"]
			// A locale with no name is not sent — an empty translation row would
			// render as a blank product name on that side of the shop.
			if (!block.name.trim()) return []
			return [
				{
					locale: code,
					name: block.name.trim(),
					...(block.slug.trim() ? { slug: block.slug.trim() } : {}),
					...(block.shortDescription.trim()
						? { shortDescription: block.shortDescription.trim() }
						: {}),
					...(block.description.trim() ? { description: block.description.trim() } : {}),
				},
			]
		})

		const defaultVariant = product?.variants.find((v) => v.isDefault) ?? product?.variants[0]

		/**
		 * Only the keys these two tabs own.
		 *
		 * The API treats an array it receives as the complete truth. Every key
		 * this form sends is one it fully owns and displays: translations,
		 * categories, prices, tiers, attributes and options.
		 *
		 * What it deliberately does NOT send is anything inside the variant
		 * beyond the default one's own fields — no variant prices, tiers or
		 * attribute values. Those belong to the Variations tab, and sending an
		 * empty array for them would delete data this form never showed.
		 */
		const regular = form.prices.GUEST.basePrice.trim()
		const regularSale = form.prices.GUEST.salePrice.trim()
		const dealer = form.prices.RESELLER.basePrice.trim()
		const dealerSale = form.prices.RESELLER.salePrice.trim()
		const hasDealerLadder = form.tiers.some((row) => row.reseller.trim())

		const prices: ProductPrice[] = []

		if (regular) {
			prices.push({
				role: "GUEST",
				basePrice: regular,
				...(regularSale ? { salePrice: regularSale } : {}),
			})
		}

		// A dealer ladder needs a RESELLER row to hang from — the rungs attach to
		// the price row of their own role, and a role with no row is never
		// resolved at all. When no dealer price was typed, the regular price is
		// that row's base, which is exactly what "leave empty to use the regular
		// price" says on the field.
		if (dealer || (hasDealerLadder && regular)) {
			prices.push({
				role: "RESELLER",
				basePrice: dealer || regular,
				...(dealerSale ? { salePrice: dealerSale } : {}),
			})
		}

		/**
		 * The table unfolded back into one row per (role, quantity).
		 *
		 * An empty cell is dropped rather than sent as zero — an abandoned row
		 * must not silently price the product at nothing. A row with both cells
		 * empty therefore disappears entirely, which is what deleting it means.
		 */
		const tiers: ProductTier[] = []

		for (const row of [...form.tiers].sort((a, b) => a.minQuantity - b.minQuantity)) {
			const retail = row.retail.trim()
			const reseller = row.reseller.trim()

			if (retail) {
				tiers.push({
					role: "GUEST",
					minQuantity: row.minQuantity,
					type: "FIXED_PRICE",
					value: retail,
				})
			}
			if (reseller) {
				tiers.push({
					role: "RESELLER",
					minQuantity: row.minQuantity,
					type: "FIXED_PRICE",
					value: reseller,
				})
			}
		}

		const payload: ProductPayload = {
			kind: form.kind,
			status: form.status,
			visibility: form.visibility,
			quoteEnabled: form.quoteEnabled,
			taxStatus: form.taxStatus,
			moq: form.moq,
			sortOrder: form.sortOrder,
			categoryIds: form.categoryIds,
			featuredAssetId: form.featuredAssetId,
			assetIds: form.assetIds,
			translations,
			prices,
			tiers,
			attributes: form.attributes
				// A half-filled row — an attribute chosen but no values yet — is
				// dropped rather than rejected, so an abandoned row cannot block a
				// save of everything else.
				.filter((a) => a.attributeId && a.attributeValueIds.length > 0)
				.map((a) => ({
					attributeId: a.attributeId,
					attributeValueIds: a.attributeValueIds,
					isVisible: a.isVisible,
					isVariation: a.isVariation,
				})),
			options: form.options
				.filter((o) => o.optionProductId)
				.map((o, index) => ({
					optionProductId: o.optionProductId,
					sortOrder: o.sortOrder ?? index,
					groupLabel: o.groupLabel.trim() || null,
					preselected: o.preselected,
				})),
			variants: [
				{
					...(defaultVariant?.id ? { id: defaultVariant.id } : {}),
					sku: form.sku.trim(),
					isDefault: true,
					isActive: true,
					sortOrder: 0,
					manageStock: form.manageStock,
					stock: form.stock,
					allowBackorder: form.allowBackorder,
					// Null rather than omitted when empty. The Shipping tab owns
					// these four now, so clearing a weight has to actually clear
					// it — an omitted key would leave the old value in place.
					weightKg: form.weightKg.trim() || null,
					lengthCm: form.lengthCm.trim() || null,
					widthCm: form.widthCm.trim() || null,
					heightCm: form.heightCm.trim() || null,
				},
			],
		}

		try {
			if (isEdit) {
				await updateProduct({ id: product.id, data: payload }).unwrap()
				toast.success("Product saved.")
			} else {
				const created = await createProduct(payload).unwrap()
				toast.success("Product created.")
				router.replace(`/admin/dashboard/products/${created.id}/edit`)
			}
		} catch (error) {
			// The API names the offending SKU and the product that owns it.
			const message = (error as { data?: { message?: string } })?.data?.message
			toast.error(message ?? "Could not save the product.")
		}
	}

	return (
		<ProForm
			onSubmit={onSubmit}
			resolver={zodResolver(schema)}
			defaultValues={toDefaults(product)}
			className="space-y-5"
		>
			{/*
			 * Sticky, so Save stays reachable while scrolling a long tier ladder.
			 * One Save button rather than a second in the Publish box — on a wide
			 * screen both would be on screen at once, which reads as two different
			 * actions.
			 */}
			<div className="bg-background sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b py-3">
				<Button
					type="button"
					variant="ghost"
					size="lg"
					onClick={() => router.push("/admin/dashboard/products")}
				>
					<ArrowLeft />
					Products
				</Button>
				{isEdit && (
					<span className="text-muted-foreground font-mono text-xs">{product.id}</span>
				)}
				<div className="ml-auto">
					<ProSubmit>{isEdit ? "Save changes" : "Create product"}</ProSubmit>
				</div>
			</div>

			{/*
			 * Two columns, as WooCommerce arranges it: what the product *is* on
			 * the left, how it is published and filed on the right. The sidebar
			 * sticks on wide screens so status and Save stay reachable while
			 * scrolling a long tier ladder, and stacks underneath on narrow ones.
			 */}
			<div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
				<div className="min-w-0 space-y-5">
			{/* Title and descriptions sit above the data panel, as in WooCommerce. */}
			<section className="bg-card space-y-4 rounded-lg border p-5">
				<Tabs value={activeLocale} onValueChange={setActiveLocale}>
					<TabsList>
						{EDITOR_LOCALES.map(({ code, label }) => {
							const filled = !!translationFor(product, code)?.name
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
							<ProInput
								name={`${code}.name`}
								label="Product name"
								required={code === "en"}
							/>
							<ProPermalink
								name={`${code}.slug`}
								sourceName={`${code}.name`}
								baseUrl={
									code === "de"
										? `${SITE_URL}/de/produkt/`
										: `${SITE_URL}/products/`
								}
							/>
							<ProRichText
								name={`${code}.shortDescription`}
								label="Short description"
								description="The summary beside the gallery."
								minHeight="6rem"
							/>
							<ProRichText
								name={`${code}.description`}
								label="Description"
								description="The full description tab on the product page."
								minHeight="14rem"
							/>
						</TabsContent>
					))}
				</Tabs>
			</section>

			<section className="bg-card rounded-lg border">
				<div className="border-b px-5 py-3">
					<h2 className="font-heading text-sm font-semibold">Product data</h2>
				</div>

				<Tabs defaultValue="general" className="gap-0">
					<TabsList className="mx-5 mt-4">
						<TabsTrigger value="general">General</TabsTrigger>
						<TabsTrigger value="inventory">Inventory</TabsTrigger>
						<TabsTrigger value="shipping">Shipping</TabsTrigger>
						<TabsTrigger value="attributes">Attributes</TabsTrigger>
						<TabsTrigger value="options">Options</TabsTrigger>
					</TabsList>

					<TabsContent value="general" className="space-y-6 p-5">
						{/* The price everyone pays. Written to the GUEST row, which is
						    where resolvePrice()'s fallback chain terminates — so it is
						    what every role falls back to when no override exists. */}
						<div className="grid gap-4 sm:grid-cols-2">
							<ProInput
								name="prices.GUEST.basePrice"
								label="Regular price"
								description="What a customer pays for one."
								placeholder="0.00"
							/>
							<ProInput
								name="prices.GUEST.salePrice"
								label="Sale price"
								description="Leave empty for no sale."
								placeholder="—"
							/>
							<ProInput
								name="prices.RESELLER.basePrice"
								label="Reseller price"
								description="For approved dealers. Leave empty and they pay the regular price."
								placeholder="—"
							/>
							<ProInput
								name="prices.RESELLER.salePrice"
								label="Reseller sale price"
								placeholder="—"
							/>
						</div>

						<div className="border-t pt-5">
							<MoqField />
						</div>

						<div className="border-t pt-5">
							<QuantityPricing />
						</div>

						<div className="space-y-4 border-t pt-5">
							<ProSelect
								name="taxStatus"
								label="Tax status"
								description="Whether tax applies at all. Which rate is decided by the tax class."
								options={[
									{ label: "Taxable", value: "TAXABLE" },
									{ label: "Only during shipping", value: "SHIPPING_ONLY" },
									{ label: "None", value: "NONE" },
								]}
								className="sm:max-w-xs"
							/>

							<ProCheckbox
								name="quoteEnabled"
								label="Price on request"
								description='Hides the price, blocks add-to-cart, and offers "Add to quote request" instead.'
							/>
						</div>
					</TabsContent>

					<TabsContent value="inventory" className="space-y-4 p-5">
						<ProInput
							name="sku"
							label="SKU"
							description="Must be unique across the whole catalogue."
							required
						/>

						<ProCheckbox name="manageStock" label="Track stock for this product" />

						<div className="grid gap-4 sm:grid-cols-2">
							<ProInput name="stock" type="number" label="Stock quantity" />
						</div>

						<ProCheckbox
							name="allowBackorder"
							label="Allow backorders"
							description="Customers may order while stock is zero."
						/>
					</TabsContent>

					<TabsContent value="shipping" className="space-y-6 p-5">
						<ProInput
							name="weightKg"
							label="Weight (kg)"
							description="Per item. Shipping is priced by the total weight of the cart, so a product left empty counts as 0 kg and can win a cheaper rate than it should."
							placeholder="0.000"
							className="sm:max-w-xs"
						/>

						<div className="space-y-3 border-t pt-5">
							<div>
								<h3 className="text-sm font-medium">Dimensions (cm)</h3>
								<p className="text-muted-foreground mt-1 max-w-prose text-xs">
									Length, width and height of one packed item. Shipping is
									priced by weight, not by size, so these are for packing and
									your own records.
								</p>
							</div>

							<div className="grid gap-4 sm:grid-cols-3">
								<ProInput name="lengthCm" label="Length" placeholder="—" />
								<ProInput name="widthCm" label="Width" placeholder="—" />
								<ProInput name="heightCm" label="Height" placeholder="—" />
							</div>
						</div>
					</TabsContent>

					<TabsContent value="attributes" className="p-5">
						<AttributesTab />
					</TabsContent>
					<TabsContent value="options" className="p-5">
						<OptionsTab currentProductId={product?.id} />
					</TabsContent>
				</Tabs>
			</section>
				</div>

				<aside className="space-y-5 lg:sticky lg:top-4">
					<section className="bg-card rounded-lg border">
						<h2 className="font-heading border-b px-4 py-3 text-sm font-semibold">
							Publish
						</h2>
						<div className="space-y-4 p-4">
							<ProSelect
								name="status"
								label="Status"
								options={[
									{ label: "Draft", value: "DRAFT" },
									{ label: "Published", value: "PUBLISHED" },
									{ label: "Archived", value: "ARCHIVED" },
								]}
							/>
							<ProSelect
								name="visibility"
								label="Catalogue visibility"
								description="Never derived from anything else — always your explicit choice."
								options={[
									{ label: "Shop and search", value: "SHOP_AND_SEARCH" },
									{ label: "Shop only", value: "SHOP_ONLY" },
									{ label: "Search only", value: "SEARCH_ONLY" },
									{ label: "Hidden", value: "HIDDEN" },
								]}
							/>
							<ProInput
								name="sortOrder"
								type="number"
								label="Sort order"
								description="Lower numbers appear first."
							/>

						</div>
					</section>

					<section className="bg-card rounded-lg border">
						<h2 className="font-heading border-b px-4 py-3 text-sm font-semibold">
							Categories
						</h2>
						<div className="p-4">
							<ProCombobox
								name="categoryIds"
								multiple
								options={categoryOptions}
								placeholder="No categories"
							/>
						</div>
					</section>

					<section className="bg-card rounded-lg border">
						<h2 className="font-heading border-b px-4 py-3 text-sm font-semibold">
							Images
						</h2>
						<div className="p-4">
							<ProductImages product={product} />
						</div>
					</section>

					<section className="bg-card rounded-lg border">
						<h2 className="font-heading border-b px-4 py-3 text-sm font-semibold">
							Dashboard label
						</h2>
						<div className="p-4">
							<ProSelect
								name="kind"
								description="Tells staff a main product from a configurator option at a glance. Changes no behaviour and never reaches the storefront."
								options={[
									{ label: "Main product", value: "MAIN" },
									{ label: "Option", value: "OPTION" },
								]}
							/>
						</div>
					</section>
				</aside>
			</div>
		</ProForm>
	)
}

export default ProductForm
