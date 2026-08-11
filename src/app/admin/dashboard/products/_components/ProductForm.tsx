"use client"

import { useRef, useState } from "react"
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
import ValidationSummary from "./ValidationSummary"
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
import { SITE_URL } from "@/lib/siteUrl"
import { TIER_ROLES, tierUnitPrice, type TierRole } from "@/lib/tiers"
import {
	buildTree,
	displayName,
	flattenTree,
} from "../../categories/_components/categoryTree"

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
 * One rung: from what quantity, how to read the amount, and the amount.
 *
 * Mirrors WholesaleX's tier entry exactly — `_min_quantity`, `_discount_type`,
 * `_discount_amount` (§4.2) — so a migrated ladder round-trips through this
 * form unchanged.
 */
const tierRow = z.object({
	minQuantity: z.number({ message: "Enter a quantity" }).int().min(1, "At least 1"),
	type: z.enum(["FIXED_PRICE", "PERCENTAGE", "FIXED_AMOUNT"]),
	amount: moneyField,
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
	artworkMaxFiles: z.number({ message: "Enter a number" }).int().min(0).max(20),
	artworkRequired: z.boolean(),
	moq: z.number({ message: "Enter a number" }).int().min(0),
	sortOrder: z.number({ message: "Enter a number" }).int().min(0),
	categoryIds: z.array(z.string()),

	// Media. Ids only — the thumbnails to draw them with live in the panel's
	// own state, because the API takes ids and nothing else.
	featuredAssetId: z.string().nullable(),
	assetIds: z.array(z.string()),

	/**
	 * Optional, and left empty when left empty.
	 *
	 * The name is the only thing an admin must type. A blank SKU used to be
	 * filled in from the product name, which stopped the form failing silently
	 * but meant the catalogue quietly filled with invented identifiers nobody
	 * had chosen and every stock report then had to carry. A SKU is a real
	 * business identifier: either it is the one the client uses, or there isn't
	 * one yet.
	 */
	sku: z.string().trim().max(100),
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

	/**
	 * One ladder per audience, keyed by role.
	 *
	 * Not a single array with a role column: the three ladders are edited
	 * independently — the retail one has eight rungs while the dealer one may
	 * have four — and interleaving them in one table made the shared quantity
	 * column a lie.
	 */
	tiers: z.object({
		GUEST: z.array(tierRow),
		B2C: z.array(tierRow),
		RESELLER: z.array(tierRow),
	}),

	/**
	 * Rows are not validated for completeness — `onSubmit` already drops the
	 * half-filled ones. Rejecting what the submit handler would silently
	 * discard only produced an error the admin could not act on, on a tab they
	 * may not have open.
	 */
	attributes: z.array(
		z.object({
			attributeId: z.string(),
			attributeValueIds: z.array(z.string()),
			isVisible: z.boolean(),
			isVariation: z.boolean(),
		})
	),

	options: z.array(
		z.object({
			optionProductId: z.string(),
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

		/**
		 * A sale price above the price it discounts is not a sale.
		 *
		 * `resolvePrice` charges the sale price whenever one is set and in
		 * window; it never compares it to the base. So 200 on sale against 100
		 * regular bills the customer *more* than the product costs, and the
		 * product page strikes through the 100 to advertise it as the saving.
		 * The API rejects this too — caught here so the admin sees which field
		 * is wrong instead of a request failing after Save.
		 *
		 * Equal passes. It is pointless, not wrong, and it is a normal state to
		 * pass through while typing.
		 */
		const saleRows = [
			{ role: "GUEST" as const, base: regular, label: "regular" },
			// An empty reseller price means dealers pay the regular one — that is
			// what the field says and what `onSubmit` sends as the row's base, so
			// the reseller sale has to be measured against the same number.
			{ role: "RESELLER" as const, base: dealer || regular, label: dealer ? "reseller" : "regular" },
		]

		for (const { role, base, label } of saleRows) {
			const sale = values.prices[role].salePrice.trim()
			if (!sale) continue

			// With no price to hang from, `onSubmit` drops the whole row and the
			// sale price disappears without a word. Said plainly rather than
			// compared against an implied zero, which would read as "too high".
			if (!base) {
				ctx.addIssue({
					code: "custom",
					path: ["prices", role, "salePrice"],
					message: "Set a regular price for this sale price to discount.",
				})
				continue
			}

			if (Number(sale) > Number(base)) {
				ctx.addIssue({
					code: "custom",
					path: ["prices", role, "salePrice"],
					message: `Must not be above the ${label} price of ${base}.`,
				})
			}
		}

		/**
		 * What each role's ladder is measured against.
		 *
		 * A rung attaches to the price row of its own role, and a role with no
		 * row is never resolved at all — so a ladder without a base is dead data
		 * the shop will silently ignore. `onSubmit` seeds a missing role's row
		 * from the regular price, so that is what the base falls back to here.
		 * The sale price wins when there is one, because that is what
		 * `resolvePrice` discounts from.
		 */
		const baseFor = (role: TierRole): string => {
			const own = values.prices[role === "B2C" ? "GUEST" : role]
			const sale = own.salePrice.trim()
			const list = own.basePrice.trim()
			return sale || list || regular
		}

		for (const { key: role, label } of TIER_ROLES) {
			const ladder = rows[role]
			if (!ladder.length) continue

			const base = baseFor(role)

			if (!base) {
				ctx.addIssue({
					code: "custom",
					path: ["prices", "GUEST", "basePrice"],
					message: `Set a regular price before adding ${label.toLowerCase()} quantity discounts.`,
				})
			}

			// Two rungs at the same quantity: which one wins is undefined, since
			// the resolver picks by highest threshold and both are equally high.
			const seen = new Map<number, number>()
			ladder.forEach((row, index) => {
				const first = seen.get(row.minQuantity)
				if (first === undefined) {
					seen.set(row.minQuantity, index)
					return
				}
				ctx.addIssue({
					code: "custom",
					path: ["tiers", role, index, "minQuantity"],
					message: `Row ${first + 1} already covers ${row.minQuantity}.`,
				})
			})

			// A percentage cannot take more than the whole price away.
			ladder.forEach((row, index) => {
				if (row.type !== "PERCENTAGE") return
				const amount = row.amount.trim()
				if (amount && Number(amount) > 100) {
					ctx.addIssue({
						code: "custom",
						path: ["tiers", role, index, "amount"],
						message: "A discount cannot be more than 100 %.",
					})
				}
			})

			/**
			 * §4.2 found a live product whose Reseller ladder went *up* at 1000 —
			 * order more, pay more per unit. This is the validation that note asks
			 * for, and it now has to compare **resolved unit prices** rather than
			 * raw amounts: with three discount types in play, "20" can be a
			 * cheaper rung than "15" or a dearer one depending on how each is
			 * read. The base price seeds the comparison, so a first rung that
			 * costs more than the regular price is caught as the same mistake.
			 */
			const baseValue = base ? Number(base) : null

			const ordered = [...ladder]
				.map((row, index) => ({ row, index }))
				.sort((a, b) => a.row.minQuantity - b.row.minQuantity)

			let previous = baseValue
			for (const { row, index } of ordered) {
				const amount = row.amount.trim()
				if (!amount) continue

				const unit = tierUnitPrice(baseValue, row.type, Number(amount))
				if (unit === null) continue

				if (previous !== null && unit > previous + 1e-9) {
					ctx.addIssue({
						code: "custom",
						path: ["tiers", role, index, "amount"],
						message: `Works out at ${unit.toFixed(2)} per unit — above the ${previous.toFixed(
							2
						)} charged for a smaller order.`,
					})
				}
				previous = unit
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
 * The flat (role, quantity) rows split into one ladder per role.
 *
 * Every type is read now, not just fixed-price: a percentage rung entered here
 * has to come back as a percentage rung, and an earlier version that filtered
 * to `FIXED_PRICE` would have silently dropped the others on the next save.
 */
const toTierRows = (product?: AdminProduct) => {
	const ladderFor = (role: PriceRole) =>
		(product?.tiers ?? [])
			.filter((tier) => tier.role === role)
			.sort((a, b) => a.minQuantity - b.minQuantity)
			.map((tier) => ({
				minQuantity: tier.minQuantity,
				type: tier.type,
				amount: tier.value,
			}))

	return {
		GUEST: ladderFor("GUEST"),
		B2C: ladderFor("B2C"),
		RESELLER: ladderFor("RESELLER"),
	}
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
		/**
		 * New products are published.
		 *
		 * Drafting was the default and nothing said so, so a product filled in
		 * and saved simply did not appear in the shop — indistinguishable from a
		 * save that failed. Publishing is what an admin adding a product means to
		 * do; the ones that genuinely need holding back are the exception, and
		 * the selector is right there on the same panel as Save.
		 */
		status: product?.status ?? "PUBLISHED",
		visibility: product?.visibility ?? "SHOP_AND_SEARCH",
		kind: product?.kind ?? "MAIN",
		quoteEnabled: product?.quoteEnabled ?? false,
		artworkMaxFiles: product?.artworkMaxFiles ?? 0,
		artworkRequired: product?.artworkRequired ?? false,
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
	const [tab, setTab] = useState("general")

	/**
	 * Switching tabs used to throw the page around.
	 *
	 * The panels are wildly different heights — General carries prices, MOQ and
	 * the whole quantity ladder; Shipping is four boxes. Clicking from a long one
	 * to a short one shrinks the scroll container under the reader, the browser
	 * clamps the scroll position, and the view lurches downwards for no reason
	 * the reader can see.
	 *
	 * Two things fix it together. The panels share a floor height, so the
	 * difference is small enough not to move anything in most cases; and when
	 * the strip has scrolled out of sight above, it is brought back — landing on
	 * a new tab should show you its heading, not its middle.
	 */
	const tabStripRef = useRef<HTMLDivElement>(null)

	const changeTab = (next: string) => {
		setTab(next)

		const strip = tabStripRef.current
		if (!strip) return

		// Only when it is actually above the fold. Scrolling a strip that is
		// already in view is motion for its own sake.
		const { top } = strip.getBoundingClientRect()
		if (top >= 0) return

		strip.scrollIntoView({
			behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
				? "auto"
				: "smooth",
			block: "start",
		})
	}

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

		/**
		 * The three ladders flattened back to one row per (role, quantity).
		 *
		 * A rung with no amount is dropped rather than sent as zero — an
		 * abandoned row must not silently price the product at nothing. Sorted by
		 * quantity so the stored ladder reads in order even if the table did not.
		 */
		const tiers: ProductTier[] = []

		for (const { key: role } of TIER_ROLES) {
			for (const row of [...form.tiers[role]].sort((a, b) => a.minQuantity - b.minQuantity)) {
				const amount = row.amount.trim()
				if (!amount) continue

				tiers.push({
					role,
					minQuantity: row.minQuantity,
					type: row.type,
					value: amount,
				})
			}
		}

		const hasLadder = (role: TierRole) => tiers.some((tier) => tier.role === role)

		const prices: ProductPrice[] = []

		if (regular) {
			prices.push({
				role: "GUEST",
				basePrice: regular,
				...(regularSale ? { salePrice: regularSale } : {}),
			})
		}

		/**
		 * A ladder needs a price row of its own role to hang from.
		 *
		 * The rungs attach to the price row of their own role, and a role with no
		 * row is never resolved at all — so a B2C ladder without a B2C price is
		 * data the shop would silently ignore. Where the admin gave no price for
		 * that role, the regular price becomes the row's base, which is what
		 * "leave empty and they pay the regular price" says on the field.
		 */
		if (hasLadder("B2C") && regular) {
			prices.push({
				role: "B2C",
				basePrice: regular,
				...(regularSale ? { salePrice: regularSale } : {}),
			})
		}

		if (dealer || (hasLadder("RESELLER") && regular)) {
			prices.push({
				role: "RESELLER",
				basePrice: dealer || regular,
				...(dealerSale ? { salePrice: dealerSale } : {}),
			})
		}

		const payload: ProductPayload = {
			kind: form.kind,
			status: form.status,
			visibility: form.visibility,
			quoteEnabled: form.quoteEnabled,
			artworkMaxFiles: form.artworkMaxFiles,
			artworkRequired: form.artworkRequired,
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
					// Null, not "". The column is unique, so two products without a
					// SKU would collide on the empty string; NULLs do not.
					sku: form.sku.trim() || null,
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

			<ValidationSummary onJump={changeTab} />

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

				{/* Controlled, so a failed save can open the tab holding the error.
				    Uncontrolled, a required field on a hidden tab made Save look
				    broken — see ValidationSummary. */}
				<Tabs value={tab} onValueChange={changeTab} className="gap-0">
					<div ref={tabStripRef} className="scroll-mt-4 px-5 pt-4">
						<TabsList>
							<TabsTrigger value="general">General</TabsTrigger>
							<TabsTrigger value="inventory">Inventory</TabsTrigger>
							<TabsTrigger value="shipping">Shipping</TabsTrigger>
							<TabsTrigger value="attributes">Attributes</TabsTrigger>
							<TabsTrigger value="options">Options</TabsTrigger>
						</TabsList>
					</div>

					<TabsContent value="general" className="min-h-[26rem] space-y-6 p-5">
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

							{/* Made-to-order products are cut to a drawing the customer
							    sends. 0 hides the upload field entirely. */}
							<ProInput
								name="artworkMaxFiles"
								type="number"
								label="Design files the customer may attach"
								description="0 means this product takes no uploads. The old shop allowed 6."
								className="sm:max-w-xs"
							/>

							<ProCheckbox
								name="artworkRequired"
								label="A design file is required"
								description="Refuses checkout for a line with nothing attached. Ignored while the limit above is 0."
							/>
						</div>
					</TabsContent>

					<TabsContent value="inventory" className="min-h-[26rem] space-y-4 p-5">
						{/* Not `required`: the asterisk was the only thing on the form
						    claiming a SKU is mandatory, and it never was — the API
						    accepts a product without one. */}
						<ProInput
							name="sku"
							label="SKU"
							description="Optional. Leave it empty and the product simply has none. If you do set one, it must be unique across the whole catalogue."
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

					<TabsContent value="shipping" className="min-h-[26rem] space-y-6 p-5">
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

					<TabsContent value="attributes" className="min-h-[26rem] p-5">
						<AttributesTab />
					</TabsContent>
					<TabsContent value="options" className="min-h-[26rem] p-5">
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
