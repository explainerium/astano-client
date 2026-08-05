"use client"

import { useCallback, useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { zodResolver } from "@hookform/resolvers/zod"
import { AlertCircle, Loader2 } from "lucide-react"
import { useWatch } from "react-hook-form"
import { z } from "zod"
import ProCheckbox from "@/components/form/ProCheckbox"
import ProForm from "@/components/form/ProForm"
import ProInput from "@/components/form/ProInput"
import ProTextarea from "@/components/form/ProTextarea"
import { Link } from "@/i18n/navigation"
import useUserInfo from "@/hooks/useUserInfo"
import {
	useCartQuery,
	useCheckoutPreviewMutation,
	useMyAddressesQuery,
	usePlaceOrderMutation,
} from "@/redux/api/storefrontApi"
import { formatMoney } from "@/lib/money"
import type { CheckoutAddress, CheckoutPreview, PlacedOrder } from "@/types/storefront"
import AddressFields from "./AddressFields"
import MethodChoice, { type MethodOption } from "./MethodChoice"
import OrderPlaced from "./OrderPlaced"
import OrderSummary from "./OrderSummary"
import PreviewSync from "./PreviewSync"

const apiMessage = (error: unknown) => (error as { data?: { message?: string } })?.data?.message

/**
 * Whether the customer is shipping somewhere other than the billing address.
 *
 * `useWatch` rather than `watch()`: the latter re-renders the component that
 * owns the form, and these are leaves — they would never hear about it.
 */
const useShipToDifferent = () => Boolean(useWatch({ name: "shipToDifferent" }))

const buildAddress = (t: (key: string) => string) =>
	z.object({
		firstName: z.string().trim().min(1, t("required")).max(100),
		lastName: z.string().trim().min(1, t("required")).max(100),
		company: z.string().trim().max(200),
		street1: z.string().trim().min(1, t("required")).max(200),
		street2: z.string().trim().max(200),
		postcode: z.string().trim().min(1, t("required")).max(30),
		city: z.string().trim().min(1, t("required")).max(120),
		state: z.string().trim().max(120),
		countryCode: z.string().trim().length(2, t("required")),
		phone: z.string().trim().max(50),
		email: z.union([z.literal(""), z.string().trim().email(t("invalidEmail"))]),
	})

/**
 * The delivery address, with no field required.
 *
 * Not `buildAddress(t).partial()`: `.partial()` only lets a key be *absent*,
 * and these keys are always present as empty strings because the form seeds
 * them. Every required field would then fail min(1) while its input is not
 * even rendered — a submit that silently does nothing, with the error attached
 * to a field nobody can see. Requiredness is applied conditionally in
 * superRefine below instead.
 */
const buildOptionalAddress = (t: (key: string) => string) =>
	z.object({
		firstName: z.string().trim().max(100),
		lastName: z.string().trim().max(100),
		company: z.string().trim().max(200),
		street1: z.string().trim().max(200),
		street2: z.string().trim().max(200),
		postcode: z.string().trim().max(30),
		city: z.string().trim().max(120),
		state: z.string().trim().max(120),
		countryCode: z.string().trim().max(2),
		phone: z.string().trim().max(50),
		email: z.union([z.literal(""), z.string().trim().email(t("invalidEmail"))]),
	})

const buildSchema = (t: (key: string) => string) => {
	const address = buildAddress(t)
	return z
		.object({
			billing: address,
			shipToDifferent: z.boolean(),
			shipping: buildOptionalAddress(t),
			customerNote: z.string().trim().max(2000),
			vatNumber: z.string().trim().max(40),
		})
		.superRefine((values, ctx) => {
			// The delivery address is only a real address when it is being used.
			if (!values.shipToDifferent) return
			for (const field of [
				"firstName",
				"lastName",
				"street1",
				"postcode",
				"city",
				"countryCode",
			] as const) {
				if (!values.shipping?.[field]?.trim()) {
					ctx.addIssue({
						code: "custom",
						path: ["shipping", field],
						message: t("required"),
					})
				}
			}
		})
}

type FormValues = z.infer<ReturnType<typeof buildSchema>>

const EMPTY_ADDRESS = {
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

/** Blank optional fields are omitted rather than sent as empty strings. */
const toApiAddress = (values: Record<string, string | undefined>): CheckoutAddress => {
	const optional = (value?: string) => (value?.trim() ? value.trim() : undefined)
	return {
		firstName: values.firstName!.trim(),
		lastName: values.lastName!.trim(),
		company: optional(values.company),
		street1: values.street1!.trim(),
		street2: optional(values.street2),
		city: values.city!.trim(),
		state: optional(values.state),
		postcode: values.postcode!.trim(),
		countryCode: values.countryCode!.trim().toUpperCase(),
		phone: optional(values.phone),
		email: optional(values.email),
	}
}

/**
 * Checkout.
 *
 * R7 is enforced here first: an account is required to place an order, and a
 * signed-out visitor is asked to sign in rather than being allowed to fill the
 * form and fail at the end. The endpoint is auth()-only regardless, so this is
 * courtesy rather than security.
 *
 * Every total on the page comes from POST /checkout/preview and is recomputed
 * whenever the destination or the delivery method changes. Nothing is added up
 * locally — shipping is taxable, so a naive "subtotal + shipping + 19%" would
 * disagree with the invoice the customer eventually receives.
 */
export const CheckoutView = () => {
	const t = useTranslations("checkout")
	const locale = useLocale()
	const { isLoggedIn, isResolved } = useUserInfo()

	const { data: cart, isLoading: cartLoading } = useCartQuery()
	const { data: addresses, isLoading: addressesLoading } = useMyAddressesQuery(undefined, {
		skip: !isLoggedIn,
	})

	const [runPreview, previewState] = useCheckoutPreviewMutation()
	const [placeOrder, placeState] = usePlaceOrderMutation()

	const [preview, setPreview] = useState<CheckoutPreview | null>(null)
	const [shippingMethodId, setShippingMethodId] = useState<string | null>(null)
	const [paymentMethodId, setPaymentMethodId] = useState<string | null>(null)
	const [order, setOrder] = useState<PlacedOrder | null>(null)
	const [error, setError] = useState<string | null>(null)

	const schema = useMemo(() => buildSchema(t), [t])

	const defaultBilling = addresses?.find((a) => a.isDefaultBilling) ?? addresses?.[0]

	/**
	 * Recalculates totals. Also reconciles the chosen delivery method: an
	 * address change can withdraw the method that was selected, and silently
	 * keeping it would let the customer submit an order the server rejects.
	 */
	const recalculate = useCallback(
		async (destination: Record<string, string | undefined>, methodId: string | null) => {
			setError(null)
			try {
				// Sent as shippingAddress because that is what it is — the preview
				// resolves tax and shipping against the delivery destination, and
				// falls back to the billing address only when there is no separate
				// one. Empty optional fields are stripped: the API validates
				// `email` as an email, and "" is not one.
				const result = await runPreview({
					shippingAddress: toApiAddress(destination),
					...(methodId ? { shippingMethodId: methodId } : {}),
				}).unwrap()

				setPreview(result)

				const usable = result.shippingOptions.filter((option) => !option.unavailableReason)
				setShippingMethodId((current) =>
					current && usable.some((option) => option.methodId === current) ? current : null
				)
				setPaymentMethodId((current) =>
					current && result.paymentMethods.some((m) => m.id === current && m.eligible)
						? current
						: null
				)
			} catch (caught) {
				setError(apiMessage(caught) ?? t("placeFailed"))
				setPreview(null)
			}
		},
		[runPreview, t]
	)

	const onSubmit = async (values: FormValues) => {
		if (!shippingMethodId || !paymentMethodId) return
		setError(null)
		try {
			const placed = await placeOrder({
				billingAddress: toApiAddress(values.billing),
				...(values.shipToDifferent
					? { shippingAddress: toApiAddress(values.shipping as Record<string, string>) }
					: {}),
				shippingMethodId,
				paymentMethodId,
				...(values.customerNote.trim() ? { customerNote: values.customerNote.trim() } : {}),
				...(values.vatNumber.trim() ? { vatNumber: values.vatNumber.trim() } : {}),
			}).unwrap()
			setOrder(placed)
		} catch (caught) {
			setError(apiMessage(caught) ?? t("placeFailed"))
		}
	}

	if (order) return <OrderPlaced order={order} />

	if (!isResolved || cartLoading || (isLoggedIn && addressesLoading)) {
		return (
			<p className="text-muted-foreground py-24 text-center text-sm">
				<Loader2 className="mr-2 inline size-4 animate-spin" />…
			</p>
		)
	}

	// R7 — no guest checkout. The cart survives sign-in and merges across.
	if (!isLoggedIn) {
		return (
			<div className="mx-auto w-full max-w-[520px] px-6 py-24 text-center">
				<h1 className="font-heading text-2xl font-extrabold tracking-tight">{t("title")}</h1>
				<p className="mt-4 text-sm">{t("signInRequired")}</p>
				<p className="text-muted-foreground mt-2 text-sm">{t("signInNote")}</p>
				<div className="mt-8 flex flex-wrap justify-center gap-4">
					<Link
						href="/login"
						className="bg-primary text-primary-foreground px-7 py-3 text-sm font-semibold tracking-wide uppercase transition-opacity hover:opacity-90"
					>
						{t("signIn")}
					</Link>
					<Link
						href="/register"
						className="border px-7 py-3 text-sm font-semibold tracking-wide uppercase transition-colors hover:border-neutral-400"
					>
						{t("register")}
					</Link>
				</div>
			</div>
		)
	}

	if (!cart?.items.length) {
		return (
			<div className="py-24 text-center">
				<p className="text-muted-foreground text-sm">{t("emptyCart")}</p>
				<Link
					href="/products"
					className="bg-primary text-primary-foreground mt-6 inline-flex px-7 py-3 text-sm font-semibold tracking-wide uppercase"
				>
					{t("keepShopping")}
				</Link>
			</div>
		)
	}

	const shippingOptions: MethodOption[] = (preview?.shippingOptions ?? []).map((option) => ({
		id: option.methodId,
		title: option.name,
		trailing: formatMoney(option.cost, locale) ?? undefined,
		disabled: Boolean(option.unavailableReason),
		disabledReason:
			option.unavailableReason === "NO_MATCHING_BAND"
				? t("unavailableNoBand")
				: option.unavailableReason === "BELOW_FREE_THRESHOLD"
					? t("unavailableBelowFree")
					: option.unavailableReason
						? t("unavailableNotConfigured")
						: undefined,
	}))

	const reasonLabel = (reason?: string) => {
		const key =
			reason === "NOT_ENOUGH_ORDER_HISTORY"
				? "reasonNotEnoughOrderHistory"
				: reason === "REQUIRES_VALIDATED_VAT_ID"
					? "reasonRequiresValidatedVatId"
					: reason === "BELOW_MINIMUM"
						? "reasonBelowMinimum"
						: reason === "ABOVE_MAXIMUM"
							? "reasonAboveMaximum"
							: null
		return key ? t(key) : t("notEligible")
	}

	const paymentOptions: MethodOption[] = (preview?.paymentMethods ?? []).map((method) => ({
		id: method.id,
		title: method.title,
		description: method.description,
		disabled: !method.eligible,
		disabledReason: method.eligible ? undefined : reasonLabel(method.reason),
	}))

	const canPlace =
		Boolean(shippingMethodId) && Boolean(paymentMethodId) && !placeState.isLoading && !!preview

	return (
		<ProForm
			onSubmit={onSubmit}
			resolver={zodResolver(schema)}
			defaultValues={{
				billing: defaultBilling
					? {
							...EMPTY_ADDRESS,
							firstName: defaultBilling.firstName ?? "",
							lastName: defaultBilling.lastName ?? "",
							company: defaultBilling.company ?? "",
							street1: defaultBilling.street1 ?? "",
							street2: defaultBilling.street2 ?? "",
							postcode: defaultBilling.postcode ?? "",
							city: defaultBilling.city ?? "",
							state: defaultBilling.state ?? "",
							countryCode: defaultBilling.countryCode ?? "DE",
							phone: defaultBilling.phone ?? "",
							email: defaultBilling.email ?? "",
						}
					: EMPTY_ADDRESS,
				shipToDifferent: false,
				shipping: EMPTY_ADDRESS,
				customerNote: "",
				vatNumber: "",
			}}
		>
			<div className="mx-auto w-full max-w-[1400px] px-6 py-12">
				<h1 className="font-heading mb-8 text-3xl font-extrabold tracking-tight sm:text-4xl">
					{t("title")}
				</h1>

				<div className="grid gap-12 lg:grid-cols-[1fr_380px] lg:items-start">
					<div className="space-y-10">
						<section>
							<h2 className="font-heading mb-5 text-xl font-semibold">{t("billingAddress")}</h2>
							<AddressFields prefix="billing" />
						</section>

						<section>
							<ProCheckbox name="shipToDifferent" label={t("shipToDifferent")} />
							<ShippingAddressSection />
						</section>

						<section>
							<h2 className="font-heading mb-2 text-xl font-semibold">{t("vatNumber")}</h2>
							<p className="text-muted-foreground mb-4 text-sm leading-relaxed">{t("vatNote")}</p>
							<ProInput name="vatNumber" label={t("vatNumber")} />
						</section>

						<section>
							<h2 className="font-heading mb-5 text-xl font-semibold">{t("delivery")}</h2>
							{!preview ? (
								<p className="text-muted-foreground text-sm">{t("enterAddressFirst")}</p>
							) : !shippingOptions.length ? (
								<p className="text-destructive flex items-center gap-2 text-sm">
									<AlertCircle className="size-4 shrink-0" />
									{t("noDelivery")}
								</p>
							) : (
								<MethodChoice
									name="shippingMethod"
									options={shippingOptions}
									value={shippingMethodId}
									onChange={setShippingMethodId}
								/>
							)}
						</section>

						<section>
							<h2 className="font-heading mb-5 text-xl font-semibold">{t("payment")}</h2>
							{!preview ? (
								<p className="text-muted-foreground text-sm">{t("enterAddressFirst")}</p>
							) : (
								<MethodChoice
									name="paymentMethod"
									options={paymentOptions}
									value={paymentMethodId}
									onChange={setPaymentMethodId}
								/>
							)}
						</section>

						<section>
							<ProTextarea
								name="customerNote"
								label={t("note")}
								placeholder={t("notePlaceholder")}
								rows={3}
							/>
						</section>
					</div>

					<div className="space-y-6 lg:sticky lg:top-6">
						<OrderSummary cart={cart} preview={preview} calculating={previewState.isLoading} />

						{error && (
							<p className="text-destructive flex items-start gap-2 text-sm" role="alert">
								<AlertCircle className="mt-0.5 size-4 shrink-0" />
								{error}
							</p>
						)}

						{preview && !shippingMethodId && !!shippingOptions.length && (
							<p className="text-muted-foreground text-sm">{t("chooseDelivery")}</p>
						)}
						{preview && !paymentMethodId && (
							<p className="text-muted-foreground text-sm">{t("choosePayment")}</p>
						)}

						<button
							type="submit"
							disabled={!canPlace}
							className="bg-primary text-primary-foreground inline-flex w-full items-center justify-center gap-2 px-6 py-4 text-sm font-semibold tracking-wide uppercase transition-opacity hover:opacity-90 disabled:opacity-50"
						>
							{placeState.isLoading && <Loader2 className="size-4 animate-spin" />}
							{placeState.isLoading
								? t("placing")
								: t("placeOrder", {
										total: formatMoney(preview?.grandTotal, locale) ?? "",
									})}
						</button>

						<Link
							href="/cart"
							className="text-muted-foreground hover:text-primary block text-center text-sm underline underline-offset-2"
						>
							{t("backToCart")}
						</Link>
					</div>
				</div>
			</div>

			<PreviewSyncBridge shippingMethodId={shippingMethodId} onRecalculate={recalculate} />
		</ProForm>
	)
}

/**
 * The delivery address block, shown only when the customer asks to ship
 * somewhere other than the billing address. Split out so that watching the
 * checkbox re-renders this and nothing else.
 */
const ShippingAddressSection = () => {
	const t = useTranslations("checkout")
	const shipToDifferent = useShipToDifferent()

	if (!shipToDifferent) return null

	return (
		<div className="mt-6">
			<h2 className="font-heading mb-5 text-xl font-semibold">{t("shippingAddress")}</h2>
			<AddressFields prefix="shipping" />
		</div>
	)
}

/** Bridges the checkbox into PreviewSync without re-rendering the whole form. */
const PreviewSyncBridge = ({
	shippingMethodId,
	onRecalculate,
}: {
	shippingMethodId: string | null
	onRecalculate: Parameters<typeof PreviewSync>[0]["onRecalculate"]
}) => {
	const shipToDifferent = useShipToDifferent()
	return (
		<PreviewSync
			shipToDifferent={shipToDifferent}
			shippingMethodId={shippingMethodId}
			onRecalculate={onRecalculate}
		/>
	)
}

export default CheckoutView
