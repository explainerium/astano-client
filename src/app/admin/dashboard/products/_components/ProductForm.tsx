"use client"

import { useTranslations } from "next-intl"
import { useLayoutEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
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
import ProductTabsEditor from "./ProductTabsEditor"
import QuantityPricing from "./QuantityPricing"
import { SITE_URL } from "@/lib/siteUrl"
import { cn } from "@/lib/utils"
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

/** The dashboard translator, as a type these builders can take. */
type T = (key: string, values?: Record<string, string | number | Date>) => string

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const slugField = (t: T) =>
	z
		.string()
		.trim()
		.refine((value) => value === "" || SLUG_PATTERN.test(value), {
			message: t("lowercaseWordsSeparatedByHyphens"),
		})

/** Empty, or a plain decimal. Matches the API's own money regex. */
const moneyField = (t: T) =>
	z
		.string()
		.trim()
		.refine((value) => value === "" || /^\d+(\.\d{1,4})?$/.test(value), {
			message: t("useANumberLike1250"),
		})

const priceFields = (t: T) => z.object({ basePrice: moneyField(t), salePrice: moneyField(t) })

/** Empty, or a decimal with up to three places — the column is Decimal(10,3). */
const weightField = (t: T) =>
	z
		.string()
	.trim()
	.refine((value) => value === "" || /^\d+(\.\d{1,3})?$/.test(value), {
		message: t("useANumberLike025"),
	})

/** Empty, or a decimal with up to two places — the columns are Decimal(10,2). */
const sizeField = (t: T) =>
	z
		.string()
	.trim()
	.refine((value) => value === "" || /^\d+(\.\d{1,2})?$/.test(value), {
		message: t("useANumberLike125"),
	})

/**
 * One rung: from what quantity, how to read the amount, and the amount.
 *
 * Mirrors WholesaleX's tier entry exactly — `_min_quantity`, `_discount_type`,
 * `_discount_amount` (§4.2) — so a migrated ladder round-trips through this
 * form unchanged.
 */
const tierRow = (t: T) =>
	z.object({
		minQuantity: z.number({ message: t("enterAQuantity") }).int().min(1, t("atLeastOne")),
		type: z.enum(["FIXED_PRICE", "PERCENTAGE", "FIXED_AMOUNT"]),
		amount: moneyField(t),
	})

const localeBlock = (nameRequired: boolean, t: T) =>
	z.object({
		name: nameRequired
			? z.string().trim().min(1, t("anEnglishNameIsRequired"))
			: z.string().trim(),
		slug: slugField(t),
		shortDescription: z.string().trim(),
		description: z.string().trim(),
	})

const buildSchema = (t: T) =>
	z.object({
	en: localeBlock(true, t),
	de: localeBlock(false, t),

	// General
	status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
	visibility: z.enum(["SHOP_AND_SEARCH", "SHOP_ONLY", "SEARCH_ONLY", "HIDDEN"]),
	kind: z.enum(["MAIN", "OPTION"]),
	quoteEnabled: z.boolean(),
	artworkMaxFiles: z.number({ message: t("enterANumber") }).int().min(0).max(20),
	artworkRequired: z.boolean(),
	moq: z.number({ message: t("enterANumber") }).int().min(0),
	sortOrder: z.number({ message: t("enterANumber") }).int().min(0),
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
	stock: z.number({ message: t("enterANumber") }).int().min(0),
	allowBackorder: z.boolean(),

	// Shipping. Stored on the default variant alongside SKU and stock, so a
	// simple product keeps them in exactly one place. Empty means "not set",
	// and the cart counts an unset weight as 0 kg when it picks a rate band.
	weightKg: weightField(t),
	lengthCm: sizeField(t),
	widthCm: sizeField(t),
	heightCm: sizeField(t),

	// Pricing. Money stays a string all the way to the API — these are
	// Decimal(12,4) and a float would lose cents on the way through.
	//
	// Two rows, not three. Retail is written to GUEST because that is where
	// resolvePrice()'s fallback chain terminates: a signed-in customer with no
	// B2C row of their own lands on it, and so does a Reseller who is still
	// awaiting approval (R5b). So one retail price covers both, and the second
	// row is the dealer price.
	prices: z.object({
		GUEST: priceFields(t),
		RESELLER: priceFields(t),
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
		GUEST: z.array(tierRow(t)),
		RESELLER: z.array(tierRow(t)),
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

	/**
	 * The shop's own tabs on the product page. Unbounded — the point of the
	 * feature is that two fixed tabs were not enough.
	 */
	tabs: z.array(
		z.object({
			sortOrder: z.number().int().min(0),
			translations: z.array(
				z.object({
					locale: z.string(),
					title: z.string().trim().max(120),
					content: z.string().trim().max(50000),
				})
			),
		})
	),

	options: z.array(
		z.object({
			optionProductId: z.string(),
			groupLabel: z.string().trim().max(120),
			sortOrder: z.number({ message: t("enterANumber") }).int().min(0),
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
					message: t("setARegularPriceForThis"),
				})
				continue
			}

			if (Number(sale) > Number(base)) {
				ctx.addIssue({
					code: "custom",
					path: ["prices", role, "salePrice"],
					message: t("mustNotBeAbovePrice", { label, base }),
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
			const own = values.prices[role]
			const sale = own.salePrice.trim()
			const list = own.basePrice.trim()
			return sale || list || regular
		}

		for (const { key: role, labelKey } of TIER_ROLES) {
			const ladder = rows[role]
			if (!ladder.length) continue

			const base = baseFor(role)

			if (!base) {
				ctx.addIssue({
					code: "custom",
					path: ["prices", "GUEST", "basePrice"],
					message: t("setRegularPriceFirst", { label: t(labelKey) }),
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
					message: t("rowAlreadyCovers", { row: first + 1, quantity: row.minQuantity }),
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
						message: t("discountOverHundred"),
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
						message: t("rungAboveSmallerOrder", {
							unit: unit.toFixed(2),
							previous: previous.toFixed(2),
						}),
					})
				}
				previous = unit
			}
		}
	})

type FormValues = z.infer<ReturnType<typeof buildSchema>>

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

	/*
	 * No B2C entry. The form offers one retail ladder and stores it as GUEST,
	 * which is where a signed-in retail customer's lookup already terminates.
	 */
	return {
		GUEST: ladderFor("GUEST"),
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

		/*
		 * Both languages are always present, in the order ProductTabsEditor
		 * addresses them by position. A tab saved with only German still gets an
		 * empty English row back, so the editor has somewhere to type.
		 */
		tabs: (product?.tabs ?? []).map((tab, index) => ({
			sortOrder: tab.sortOrder ?? index,
			translations: ["en", "de"].map((locale) => {
				const existing = tab.translations.find((tt) => tt.locale === locale)
				return {
					locale,
					title: existing?.title ?? "",
					content: existing?.content ?? "",
				}
			}),
		})),

		options: (product?.options ?? []).map((option, index) => ({
			optionProductId: option.optionProductId,
			groupLabel: option.groupLabel ?? "",
			sortOrder: option.sortOrder ?? index,
			preselected: option.preselected ?? false,
		})),
	}
}

/**
 * The thing that actually scrolls behind a given element.
 *
 * Not the window: the dashboard hangs a fixed topbar above a `main` that owns
 * the scrollbar, so window.scrollY is 0 no matter where the reader is.
 */
const scrollerOf = (el: HTMLElement): HTMLElement | Window => {
	for (let node = el.parentElement; node; node = node.parentElement) {
		const { overflowY } = getComputedStyle(node)
		if (/auto|scroll/.test(overflowY) && node.scrollHeight > node.clientHeight) return node
	}
	return window
}

export const ProductForm = ({ product }: { product?: AdminProduct }) => {
	const t = useTranslations("admin")
	const router = useRouter()
	const searchParams = useSearchParams()

	/**
	 * Where Products goes back to.
	 * 
	 * The list keeps its page and page size in its own query string, and hands
	 * that address over in ?back= when it links here. Without it this button
	 * returned to a bare /products, which is always page one — edit something on
	 * page 2 and you came back to the top of the catalogue.
	 * 
	 * Only a path on this site is followed. The value comes from the URL, and
	 * anyone can put anything in a URL.
	 */
	const backParam = searchParams.get("back")
	const backHref =
		backParam && backParam.startsWith("/admin/") && !backParam.startsWith("//")
			? backParam
			: "/admin/dashboard/products"
	const [createProduct] = useCreateProductMutation()
	const [updateProduct] = useUpdateProductMutation()
	const [activeLocale, setActiveLocale] = useState<string>(EDITOR_LOCALES[0].code)
	const [tab, setTab] = useState("general")

	/**
	 * Changing section must not move the page.
	 *
	 * The panels are wildly different heights — General carries prices, MOQ and
	 * the whole quantity ladder; Inventory is a handful of boxes. Swapping a tall
	 * panel for a short one shortens the document under a scroll position that
	 * was valid a moment ago, and the browser clamps that position to the new
	 * maximum. Nothing asked for that scroll, so the reader experiences it as the
	 * page throwing itself somewhere.
	 *
	 * So: put it back. Note where the rail sits on screen before the swap, and
	 * afterwards scroll by however far it drifted. When nothing was clamped the
	 * drift is zero and this does nothing at all, which is the common case and
	 * the whole point — a reader who can already see the section they clicked
	 * should not have the page tidied up around them.
	 *
	 * Scrolling the rail to the top instead was the first attempt, and it is
	 * worse: it moves the page every single time, including all the times it did
	 * not need to.
	 *
	 * The measurement has to straddle the swap. Taken entirely in the click
	 * handler it reads a document whose panel has not been replaced yet; taken
	 * entirely afterwards there is nothing left to compare against.
	 */
	const tabStripRef = useRef<HTMLDivElement>(null)
	const anchorRef = useRef<number | null>(null)

	const changeTab = (next: string) => {
		if (next === tab) return
		anchorRef.current = tabStripRef.current?.getBoundingClientRect().top ?? null
		setTab(next)
	}

	// After layout, before paint: the new panel's height is settled and the clamp
	// has already happened, but nothing has been drawn — so the displaced frame
	// is never shown.
	useLayoutEffect(() => {
		const anchor = anchorRef.current
		anchorRef.current = null

		const strip = tabStripRef.current
		if (anchor === null || !strip) return

		const drift = strip.getBoundingClientRect().top - anchor
		if (!drift) return

		// Positive drift means the rail slid down the screen, so the scroller has
		// to go down by the same amount to bring it back.
		scrollerOf(strip).scrollBy(0, drift)
	}, [tab])

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
		 * row is never resolved at all — so a Reseller ladder without a Reseller
		 * price is data the shop would silently ignore. Where the admin gave no
		 * dealer price, the regular price becomes the row's base, which is what
		 * "leave empty and they pay the regular price" says on the field.
		 *
		 * Nothing is written for B2C, by either price or ladder. Both fall back to
		 * GUEST, and writing a duplicate row would only give a future edit two
		 * places to disagree.
		 */
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
			/*
			 * A tab with no heading in any language is nothing — the strip has no
			 * label to draw. Within a tab, a language with no heading is dropped
			 * too, so the API is never asked to store a heading-less translation
			 * the storefront would then have to filter out again.
			 */
			tabs: form.tabs
				.map((tab, index) => ({
					sortOrder: index,
					translations: tab.translations.filter((tt) => tt.title.trim() !== ""),
				}))
				.filter((tab) => tab.translations.length > 0),

			/*
			 * Numbered from the row order, not from whatever was stored.
			 *
			 * Order is expressed by dragging the rows now, so the position in this
			 * array is the only statement of it — keeping an old sortOrder would
			 * mean a row could be moved on screen and come back where it was.
			 *
			 * The group heading and the ticked-by-default flag no longer have
			 * inputs, and are passed through so that what a product already has
			 * survives an edit made for some other reason.
			 */
			options: form.options
				.filter((o) => o.optionProductId)
				.map((o, index) => ({
					optionProductId: o.optionProductId,
					sortOrder: index,
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
				toast.success(t("productSaved"))
			} else {
				const created = await createProduct(payload).unwrap()
				toast.success(t("productCreated"))
				router.replace(`/admin/dashboard/products/${created.id}/edit`)
			}
		} catch (error) {
			// The API names the offending SKU and the product that owns it.
			const message = (error as { data?: { message?: string } })?.data?.message
			toast.error(message ?? t("couldNotSaveTheProduct"))
		}
	}

	return (
		<ProForm
			onSubmit={onSubmit}
			resolver={zodResolver(buildSchema(t))}
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
					onClick={() => router.push(backHref)}
				>
					<ArrowLeft />
					{t("products")}
				</Button>
				<div className="ml-auto">
					<ProSubmit>{isEdit ? t("saveChanges") : t("createProduct")}</ProSubmit>
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
								label={t("productName")}
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
								label={t("shortDescription")}
								description={t("theSummaryBesideTheGallery")}
								height="6rem"
							/>
							<ProRichText
								name={`${code}.description`}
								label={t("description")}
								description={t("theFullDescriptionTabOnThe")}
								height="14rem"
							/>
						</TabsContent>
					))}
				</Tabs>
			</section>

			<section className="bg-card rounded-lg border">
				<div className="border-b px-5 py-3">
					<h2 className="font-heading text-sm font-semibold">{t("productData")}</h2>
				</div>

				{/*
				 * A rail down the side rather than a strip across the top, matching
				 * the settings screens.
				 *
				 * Six sections is where a horizontal strip starts to read as a row of
				 * words: they compete with the form's own headings for the same
				 * horizontal band, and the one you are on is a small difference in a
				 * small area. Down the side they are a list you scan once, and the
				 * active one is obvious because nothing else sits beside it.
				 *
				 * Still radix Tabs, still controlled — a failed save has to be able to
				 * open the section holding the error, and an uncontrolled tab set made
				 * Save look broken when the offending field was hidden. See
				 * ValidationSummary.
				 *
				 * Below `lg` the rail goes back to a strip: a 220px column on a phone
				 * leaves nothing for the form.
				 */}
				<Tabs
					value={tab}
					onValueChange={changeTab}
					orientation="vertical"
					className="gap-0"
				>
					<div
						ref={tabStripRef}
						className="grid scroll-mt-4 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start"
					>
						{/* The column keeps its rule for the full height of the panel
						    beside it; the list inside it is what sticks. */}
						<div className="border-b p-3 lg:h-full lg:border-r lg:border-b-0">
							<TabsList
								variant="line"
								className={cn(
									"w-full gap-0.5 bg-transparent p-0",
									// Reading General means scrolling past the rail, and a
									// section list you have to scroll back up to reach is a
									// list you stop using. Sticky, it is always one click away
									// — and it is then the one thing on screen that provably
									// does not move when the panel beside it is swapped.
									//
									// Below the action bar rather than under it: that bar is
									// sticky at the top of the same scroller and 61px tall,
									// so at top-3 the rail's first section hid behind it.
									"lg:sticky lg:top-[4.5rem]",
									// Matches SettingsNav: a filled block for the active item,
									// left aligned, and no underline rule.
									"[&>button]:justify-start [&>button]:rounded-md [&>button]:px-3 [&>button]:py-2 [&>button]:text-sm [&>button]:font-medium",
									"[&>button]:text-muted-foreground [&>button:hover]:bg-muted [&>button:hover]:text-foreground",
									"[&>button[data-state=active]]:bg-accent-soft [&>button[data-state=active]]:text-foreground",
									"[&>button]:after:hidden"
								)}
							>
								<TabsTrigger value="general">{t("general")}</TabsTrigger>
								<TabsTrigger value="inventory">{t("inventory")}</TabsTrigger>
								<TabsTrigger value="shipping">{t("shipping")}</TabsTrigger>
								<TabsTrigger value="attributes">{t("attributes")}</TabsTrigger>
								<TabsTrigger value="options">{t("options")}</TabsTrigger>
								<TabsTrigger value="tabs">{t("tabs")}</TabsTrigger>
							</TabsList>
						</div>

						{/*
						 * min-w-0 so a wide table inside a panel scrolls in its own box
						 * rather than stretching the grid column.
						 *
						 * The floor is a screenful, and that is the point of it rather
						 * than a guess at a pleasant size. It is what keeps a thin
						 * section from collapsing the document so far that the reader's
						 * scroll position no longer exists — the clamp changeTab has to
						 * undo can only be as large as the height that went missing, and
						 * a screenful of floor keeps that at nothing in every case but
						 * reading the longest panel to its very last field.
						 *
						 * A thin section therefore ends in some empty card. So does a
						 * thin settings section, and the rail's rule runs the full
						 * height either way.
						 */}
						<div className="min-w-0 lg:min-h-[calc(100dvh-5rem)]">

						<TabsContent value="general" className="min-h-[26rem] space-y-6 p-5">
							{/* The price everyone pays. Written to the GUEST row, which is
							    where resolvePrice()'s fallback chain terminates — so it is
							    what every role falls back to when no override exists. */}
							<div className="grid gap-4 sm:grid-cols-2">
								<ProInput
									name="prices.GUEST.basePrice"
									label={t("regularPrice")}
									description={t("whatACustomerPaysForOne")}
									placeholder="0.00"
								/>
								<ProInput
									name="prices.GUEST.salePrice"
									label={t("salePrice")}
									description={t("leaveEmptyForNoSale")}
									placeholder="—"
								/>
								<ProInput
									name="prices.RESELLER.basePrice"
									label={t("resellerPrice")}
									description={t("forApprovedDealersLeaveEmptyAnd")}
									placeholder="—"
								/>
								<ProInput
									name="prices.RESELLER.salePrice"
									label={t("resellerSalePrice")}
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
									label={t("taxStatus")}
									description={t("whetherTaxAppliesAtAllWhich")}
									options={[
										{ label: t("taxTaxable"), value: "TAXABLE" },
										{ label: t("taxShippingOnly"), value: "SHIPPING_ONLY" },
										{ label: t("taxNone"), value: "NONE" },
									]}
									className="sm:max-w-xs"
								/>

								<ProCheckbox
									name="quoteEnabled"
									label={t("priceOnRequest")}
									description={t("priceOnRequestHelp")}
								/>

								{/* Made-to-order products are cut to a drawing the customer
								    sends. 0 hides the upload field entirely. */}
								<ProInput
									name="artworkMaxFiles"
									type="number"
									label={t("designFilesTheCustomerMayAttach")}
									description={t("0MeansThisProductTakesNo")}
									className="sm:max-w-xs"
								/>

								<ProCheckbox
									name="artworkRequired"
									label={t("aDesignFileIsRequired")}
									description={t("refusesCheckoutForALineWith")}
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
								description={t("optionalLeaveItEmptyAndThe")}
							/>

							<ProCheckbox name="manageStock" label={t("trackStockForThisProduct")} />

							<div className="grid gap-4 sm:grid-cols-2">
								<ProInput name="stock" type="number" label={t("stockQuantity")} />
							</div>

							<ProCheckbox
								name="allowBackorder"
								label={t("allowBackorders")}
								description={t("customersMayOrderWhileStockIs")}
							/>
						</TabsContent>

						<TabsContent value="shipping" className="min-h-[26rem] space-y-6 p-5">
							<ProInput
								name="weightKg"
								label={t("weightKg")}
								description={t("perItemShippingIsPricedBy")}
								placeholder="0.000"
								className="sm:max-w-xs"
							/>

							<div className="space-y-3 border-t pt-5">
								<div>
									<h3 className="text-sm font-medium">{t("dimensionsCm")}</h3>
									<p className="text-muted-foreground mt-1 max-w-prose text-xs">
										{t("dimensionsBlurb")}
									</p>
								</div>

								<div className="grid gap-4 sm:grid-cols-3">
									<ProInput name="lengthCm" label={t("length")} placeholder="—" />
									<ProInput name="widthCm" label={t("width")} placeholder="—" />
									<ProInput name="heightCm" label={t("height")} placeholder="—" />
								</div>
							</div>
						</TabsContent>

						<TabsContent value="attributes" className="min-h-[26rem] p-5">
							<AttributesTab />
						</TabsContent>

						<TabsContent value="tabs" className="min-h-[26rem] p-5">
							<ProductTabsEditor />
						</TabsContent>
						<TabsContent value="options" className="min-h-[26rem] p-5">
							<OptionsTab currentProductId={product?.id} />
						</TabsContent>
					</div>
					</div>
				</Tabs>
			</section>
				</div>

				<aside className="space-y-5 lg:sticky lg:top-4">
					<section className="bg-card rounded-lg border">
						<h2 className="font-heading border-b px-4 py-3 text-sm font-semibold">{t("publish")}</h2>
						<div className="space-y-4 p-4">
							<ProSelect
								name="status"
								label={t("status")}
								options={[
									{ label: t("statusDraft"), value: "DRAFT" },
									{ label: t("statusPublished"), value: "PUBLISHED" },
									{ label: t("statusArchived"), value: "ARCHIVED" },
								]}
							/>
							<ProSelect
								name="visibility"
								label={t("catalogueVisibility")}
								description={t("neverDerivedFromAnythingElseAlways")}
								options={[
									{ label: t("visibilityShopAndSearch"), value: "SHOP_AND_SEARCH" },
									{ label: t("visibilityShopOnly"), value: "SHOP_ONLY" },
									{ label: t("visibilitySearchOnly"), value: "SEARCH_ONLY" },
									{ label: t("hidden"), value: "HIDDEN" },
								]}
							/>
							<ProInput
								name="sortOrder"
								type="number"
								label={t("sortOrder")}
								description={t("lowerNumbersAppearFirst")}
							/>

						</div>
					</section>

					<section className="bg-card rounded-lg border">
						<h2 className="font-heading border-b px-4 py-3 text-sm font-semibold">{t("categories")}</h2>
						<div className="p-4">
							<ProCombobox
								name="categoryIds"
								multiple
								options={categoryOptions}
								placeholder={t("noCategories")}
							/>
						</div>
					</section>

					<section className="bg-card rounded-lg border">
						<h2 className="font-heading border-b px-4 py-3 text-sm font-semibold">{t("images")}</h2>
						<div className="p-4">
							<ProductImages product={product} />
						</div>
					</section>

					<section className="bg-card rounded-lg border">
						<h2 className="font-heading border-b px-4 py-3 text-sm font-semibold">{t("dashboardLabel")}</h2>
						<div className="p-4">
							<ProSelect
								name="kind"
								description={t("tellsStaffAMainProductFrom")}
								options={[
									{ label: t("mainProduct"), value: "MAIN" },
									{ label: t("option"), value: "OPTION" },
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
