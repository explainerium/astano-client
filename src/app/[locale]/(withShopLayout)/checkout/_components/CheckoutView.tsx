"use client"

import { useCallback, useMemo, useRef, useState } from "react"
import { useTranslations } from "next-intl"
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
	useAvailablePaymentMethodsQuery,
	useCartQuery,
	useCheckoutPreviewMutation,
	useMyAddressesQuery,
	usePlaceOrderMutation,
} from "@/redux/api/storefrontApi"
import { usePublicSettingsQuery } from "@/redux/api/settingApi"
import { preselectedCountry } from "@/lib/sellingLocations"
import useMoney from "@/lib/useMoney"
import type { CheckoutAddress, CheckoutPreview, PlacedOrder } from "@/types/storefront"
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
		// Required on the billing address at the client's request: made-to-order
		// goods usually need a question asked before they are made.
		company: z.string().trim().min(1, t("required")).max(200),
		street1: z.string().trim().min(1, t("required")).max(200),
		street2: z.string().trim().max(200),
		postcode: z.string().trim().min(1, t("required")).max(30),
		city: z.string().trim().min(1, t("required")).max(120),
		state: z.string().trim().max(120),
		countryCode: z.string().trim().length(2, t("required")),
		phone: z.string().trim().min(1, t("required")).max(50),
		email: z.string().trim().min(1, t("required")).email(t("invalidEmail")),
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
	// Overridden by the shop's preselected country — see defaultCountry below.
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
	// The shop's own separators and symbol. A function rather than an import,
	// so React Compiler can see that these prices depend on it.
	const formatMoney = useMoney()

	const t = useTranslations("checkout")
	const { isLoggedIn, isResolved } = useUserInfo()

	const { data: cart, isLoading: cartLoading } = useCartQuery()
	const { data: addresses, isLoading: addressesLoading } = useMyAddressesQuery(undefined, {
		skip: !isLoggedIn,
	})

	// No arguments: the shop's payment options do not depend on this basket or
	// this address, so they load with the page.
	const { data: allPaymentMethods } = useAvailablePaymentMethodsQuery()

	// Which country the address form opens on. A German shop should not make
	// every customer scroll to Deutschland — but a shop that would rather not
	// guess can say so, and then this is blank on purpose.
	const { data: shopSettings } = usePublicSettingsQuery()
	const defaultCountry = preselectedCountry(shopSettings ?? {})

	const [runPreview, previewState] = useCheckoutPreviewMutation()
	const [placeOrder, placeState] = usePlaceOrderMutation()

	const [preview, setPreview] = useState<CheckoutPreview | null>(null)
	const [shippingMethodId, setShippingMethodId] = useState<string | null>(null)
	const [paymentMethodId, setPaymentMethodId] = useState<string | null>(null)
	const [order, setOrder] = useState<PlacedOrder | null>(null)
	const [error, setError] = useState<string | null>(null)

	/** What the customer still has to choose. Filled on a submit that cannot proceed. */
	const [notice, setNotice] = useState<string[]>([])

	/**
	 * The order held one step back while the customer is asked about files.
	 *
	 * Holds the submitted values, so answering "send them later" goes straight
	 * on rather than making anybody fill the form in again. Null whenever the
	 * question is not on screen.
	 */
	const [askingAboutArtwork, setAskingAboutArtwork] = useState<FormValues | null>(null)
	const noticeRef = useRef<HTMLDivElement>(null)

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
				// An empty destination is a real call, not a mistake: it asks the API
				// what the shop offers before anyone has said where it is going. The
				// address is omitted entirely rather than sent as a bag of empty
				// strings, which validation would reject.
				const address = toApiAddress(destination)
				const hasAddress = Object.keys(address).length > 0

				const result = await runPreview({
					...(hasAddress ? { shippingAddress: address } : {}),
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

	/**
	 * `artworkAnswered` is passed in rather than read from state.
	 *
	 * The dialog calls this again after the customer chooses, and a flag read
	 * from state would still hold its old value at that moment — the question
	 * would be asked a second time, or skipped a first. An argument cannot be
	 * stale.
	 */
	const submitOrder = async (values: FormValues, artworkAnswered: boolean) => {
		/*
		 * What is still missing, said once, at the top, on submit.
		 *
		 * The button stays enabled and pressing it is what surfaces the problem —
		 * a disabled button with no explanation is the worst of both, and standing
		 * hints under it nag about steps the customer has not reached. WooCommerce
		 * puts a notice at the top of the page; so does this.
		 */
		const missing = [
			!shippingMethodId && t("chooseDelivery"),
			!paymentMethodId && t("choosePayment"),
		].filter((line): line is string => Boolean(line))

		// The `!shippingMethodId` narrowing above lives inside an array, which TS
		// cannot follow, so the guard is repeated here where it can.
		if (missing.length || !shippingMethodId || !paymentMethodId) {
			setNotice(missing)
			// The notice sits above a long address form, so on a tall checkout it
			// would otherwise appear somewhere the customer is not looking.
			noticeRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
			return
		}

		setNotice([])
		setError(null)

		/*
		 * Asked before the order goes, not explained after it.
		 *
		 * The client's rule is that print files may follow the order, so this
		 * cannot refuse — and saying nothing would be worse: somebody who meant
		 * to attach a drawing and forgot finds out when production asks. One
		 * question, only while something could still be attached.
		 */
		if (awaitingArtwork.length && !artworkAnswered) {
			setAskingAboutArtwork(values)
			return
		}

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

	/**
	 * Lines that could carry a design file and do not yet.
	 *
	 * Counted, not judged: the client's rule is that print files may follow the
	 * order, so this decides whether to *ask* before placing it — never whether
	 * the order may be placed. The API agrees; it stopped refusing them.
	 *
	 * Options count as lines of their own, because each is a product with its
	 * own artwork rules.
	 */
	const awaitingArtwork = cart.items
		.flatMap((line) => [line, ...(line.options ?? [])])
		.filter((line) => line.artwork.maxFiles > 0 && line.files.length === 0)

	const shippingOptions: MethodOption[] = (preview?.shippingOptions ?? []).map((option) => ({
		id: option.methodId,
		title: option.name,
		trailing: formatMoney(option.cost) ?? undefined,
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
							: // Not "unavailable in your country" — nobody has said which
								// country it is yet. See AWAITING_COUNTRY on the API side.
								reason === "AWAITING_COUNTRY"
								? "reasonAwaitingCountry"
								: reason === "COUNTRY_NOT_ALLOWED"
									? "reasonCountryNotAllowed"
									: reason === "REQUIRES_LOGIN"
										? "reasonRequiresLogin"
										: null
		return key ? t(key) : t("notEligible")
	}

	/**
	 * Payment options, listed from the moment the page opens.
	 *
	 * Deliberately **not** tied to the checkout preview. What a shop accepts is a
	 * property of the shop, not of one basket going to one address — so
	 * `paymentMethods` is fetched on its own with no arguments and renders
	 * immediately. Earlier versions gated this behind the preview, which meant a
	 * customer stared at "Loading…" or "enter your address" where a plain list
	 * belonged.
	 *
	 * Once the preview does arrive it takes over, because by then the country and
	 * the order total are known and the handful of restricted methods can be
	 * judged properly. Same shape either way, so the list does not jump.
	 */
	const paymentSource = preview?.paymentMethods ?? allPaymentMethods ?? []

	const paymentOptions: MethodOption[] = paymentSource.map((method) => ({
		id: method.id,
		title: method.title,
		description: method.description,
		disabled: !method.eligible,
		disabledReason: method.eligible ? undefined : reasonLabel(method.reason),
	}))

	return (
		<ProForm
			onSubmit={(values: FormValues) => submitOrder(values, false)}
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
							countryCode: defaultBilling.countryCode ?? defaultCountry,
							phone: defaultBilling.phone ?? "",
							email: defaultBilling.email ?? "",
						}
					: { ...EMPTY_ADDRESS, countryCode: defaultCountry },
				shipToDifferent: false,
				shipping: { ...EMPTY_ADDRESS, countryCode: defaultCountry },
				customerNote: "",
				vatNumber: "",
			}}
		>
			<div className="mx-auto w-full max-w-[1400px] px-6 py-12">
				<h1 className="font-heading mb-8 text-3xl font-extrabold tracking-tight sm:text-4xl">
					{t("title")}
				</h1>

				{/*
				 * The notice, in the place people look for one.
				 *
				 * `role="alert"` and `tabIndex={-1}` so a screen reader announces it
				 * and the scroll target can take focus — a visual jump alone tells a
				 * keyboard or screen-reader user nothing.
				 */}
				<div ref={noticeRef} tabIndex={-1}>
					{!!notice.length && (
						<div
							role="alert"
							className="border-destructive/40 bg-negative-soft mb-8 border px-5 py-4"
						>
							<p className="text-destructive flex items-start gap-2 text-sm font-medium">
								<AlertCircle className="mt-0.5 size-4 shrink-0" />
								{t("noticeTitle")}
							</p>
							<ul className="text-destructive mt-2 ml-6 list-disc space-y-1 text-sm">
								{notice.map((line) => (
									<li key={line}>{line}</li>
								))}
							</ul>
						</div>
					)}
				</div>

				{/*
				 * The summary is the wider of the two now that the design files are
				 * asked for inside it — an upload field, its filenames and a remove
				 * button do not fit in the 380px this used to be. The address form
				 * gives up that width and is no worse for it: it is two columns of
				 * short fields, and past a point extra width only lengthens the
				 * distance the eye travels between a label and its box.
				 *
				 * minmax(0,1fr) rather than 1fr so a long product name in the summary
				 * cannot push the form column wider than the grid.
				 */}
				<div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_460px] lg:items-start">
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
							{/*
							 * Three states, not two. "No address yet" and "we do not deliver
							 * there" both leave the list empty, and only the second is bad
							 * news — showing a red warning on a page nobody has typed into
							 * is alarming and wrong.
							 */}
							{!preview || !preview.hasDestination ? (
								<p className="text-muted-foreground text-sm">{t("awaitingAddressDelivery")}</p>
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
							{/* No gate. See paymentOptions — the list comes from its own
							    query and is here from the first paint. */}
							<MethodChoice
								name="paymentMethod"
								options={paymentOptions}
								value={paymentMethodId}
								onChange={setPaymentMethodId}
							/>
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

					{/*
					 * Capped, because a sticky column taller than the screen is a trap:
					 * once it sticks, whatever hangs below the fold can never be
					 * scrolled to — and what hangs below here is the button that places
					 * the order. It only became tall enough to matter when the design
					 * files moved in, so it scrolls within itself past that point.
					 */}
					<div className="space-y-6 lg:sticky lg:top-6 lg:max-h-[calc(100dvh-3rem)] lg:overflow-y-auto">
						<OrderSummary cart={cart} preview={preview} calculating={previewState.isLoading} />

						{error && (
							<p className="text-destructive flex items-start gap-2 text-sm" role="alert">
								<AlertCircle className="mt-0.5 size-4 shrink-0" />
								{error}
							</p>
						)}

						{/*
						 * No "choose a delivery method" / "choose a payment method" hints.
						 *
						 * They sat under the button permanently, nagging about steps the
						 * customer had not reached yet. What is missing is told at the
						 * moment it matters — on submit, in the notice at the top — which
						 * is how WooCommerce handles it and what people expect.
						 */}
						<button
							type="submit"
							disabled={placeState.isLoading}
							className="bg-primary text-primary-foreground inline-flex w-full items-center justify-center gap-2 px-6 py-4 text-sm font-semibold tracking-wide uppercase transition-opacity hover:opacity-90 disabled:opacity-50"
						>
							{placeState.isLoading && <Loader2 className="size-4 animate-spin" />}
							{placeState.isLoading
								? t("placing")
								: t("placeOrder", {
										total: formatMoney(preview?.grandTotal) ?? "",
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
			{/* Upload now, or send them on. Never "you cannot order yet". */}
			<AlertDialog
				open={!!askingAboutArtwork}
				onOpenChange={(open) => !open && setAskingAboutArtwork(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>{t("artworkPromptTitle")}</AlertDialogTitle>
						<AlertDialogDescription>
							{t("artworkPrompt", { count: awaitingArtwork.length })}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						{/* Cancel simply closes: the upload boxes are already on this page,
						    a few centimetres away, so there is nowhere to send anybody. */}
						<AlertDialogCancel>{t("artworkUploadNow")}</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => {
								const values = askingAboutArtwork
								setAskingAboutArtwork(null)
								if (values) void submitOrder(values, true)
							}}
						>
							{t("artworkSendLater")}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
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
