import type {
	AccountProfile,
	AvailablePaymentMethod,
	CartView,
	CheckoutAddress,
	CheckoutPreview,
	CustomerOrder,
	CustomerQuote,
	PlacedOrder,
	PlaceOrderPayload,
	PublicCategory,
	PublicProduct,
	PublicProductDetail,
	ProductListMeta,
	PublicProductListParams,
	QuoteBasketView,
	QuoteSubmission,
	SavedAddress,
	WishlistView,
} from "@/types/storefront"
import {
	applyClear,
	applyQuantity,
	applyRemoval,
	type OptimisticCartView,
} from "./cartOptimistic"
import { tagTypes } from "../tag-types"
import { baseApi } from "./baseApi"

/**
 * The shopper-facing catalogue. Public — no auth header required — but the
 * axios instance still sends credentials, because a signed-in dealer must get
 * their own prices from the very same URL. That is why nothing here is ever
 * cached across roles.
 */
export const storefrontApi = baseApi.injectEndpoints({
	endpoints: (build) => ({
		shopProducts: build.query<
			{ data: PublicProduct[]; meta?: ProductListMeta },
			PublicProductListParams
		>({
			query: (params) => ({ url: "/products", method: "GET", params }),
			transformResponse: (rows: PublicProduct[], meta?: ProductListMeta) => ({ data: rows, meta }),
			providesTags: [tagTypes.product],
		}),

		/**
		 * One product, priced for the requesting role at `quantity`.
		 *
		 * Quantity is part of the cache key on purpose: crossing a tier boundary
		 * has to refetch, because the unit price at 100 is not the unit price at
		 * 500 and the page must never guess which applies.
		 */
		shopProduct: build.query<PublicProductDetail, { slug: string; quantity?: number }>({
			query: ({ slug, quantity }) => ({
				url: `/products/${slug}`,
				method: "GET",
				params: quantity ? { quantity } : undefined,
			}),
			providesTags: (_result, _error, arg) => [{ type: tagTypes.product, id: arg.slug }],
		}),

		/** One category by its (per-locale) slug. 404s when hidden — rule R13. */
		shopCategory: build.query<PublicCategory, string>({
			query: (slug) => ({ url: `/categories/${slug}`, method: "GET" }),
			providesTags: (_result, _error, slug) => [{ type: tagTypes.category, id: slug }],
		}),

		shopCategories: build.query<PublicCategory[], { tree?: boolean } | void>({
			query: (params) => ({
				url: "/categories",
				method: "GET",
				params: params ?? { tree: true },
			}),
			providesTags: [tagTypes.category],
		}),

		/**
		 * Both baskets are optionalAuth: a guest fills one before deciding to
		 * register. R7 makes an account mandatory at checkout, not before.
		 *
		 * Which basket a product goes into is decided by `quoteOnly` (R2), not by
		 * the visitor — a quote-only product has no price to put in a cart.
		 */
		cart: build.query<OptimisticCartView, void>({
			query: () => ({ url: "/cart", method: "GET" }),
			providesTags: [tagTypes.cart],
		}),

		addToCart: build.mutation<
			CartView,
			{ variantId: string; quantity: number; parentItemId?: string | null }
		>({
			query: (data) => ({ url: "/cart/items", method: "POST", data }),
			invalidatesTags: [tagTypes.cart],
		}),

		/** Quantity 0 removes the line — the usual meaning of typing 0 into a cart. */
		updateCartItem: build.mutation<CartView, { id: string; quantity: number }>({
			query: ({ id, quantity }) => ({
				url: `/cart/items/${id}`,
				method: "PATCH",
				data: { quantity },
			}),
			invalidatesTags: [tagTypes.cart],
			/**
			 * Paints the new quantity before the round trip, and only the quantity.
			 * See `cartOptimistic.ts` for why the money is deliberately left alone.
			 */
			async onQueryStarted({ id, quantity }, { dispatch, queryFulfilled }) {
				const patch = dispatch(
					storefrontApi.util.updateQueryData("cart", undefined, (draft) => {
						applyQuantity(draft, id, quantity)
					})
				)
				try {
					await queryFulfilled
				} catch {
					// Put it back. The API refuses a quantity below MOQ or above
					// stock, and a stepper left showing the refused number would be
					// telling the customer their change stuck.
					patch.undo()
				}
			},
		}),

		removeCartItem: build.mutation<CartView, string>({
			query: (id) => ({ url: `/cart/items/${id}`, method: "DELETE" }),
			invalidatesTags: [tagTypes.cart],
			async onQueryStarted(id, { dispatch, queryFulfilled }) {
				const patch = dispatch(
					storefrontApi.util.updateQueryData("cart", undefined, (draft) => {
						applyRemoval(draft, id)
					})
				)
				try {
					await queryFulfilled
				} catch {
					patch.undo()
				}
			},
		}),

		clearCart: build.mutation<CartView, void>({
			query: () => ({ url: "/cart", method: "DELETE" }),
			invalidatesTags: [tagTypes.cart],
			async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
				const patch = dispatch(
					storefrontApi.util.updateQueryData("cart", undefined, (draft) => {
						applyClear(draft)
					})
				)
				try {
					await queryFulfilled
				} catch {
					patch.undo()
				}
			},
		}),

		quoteBasket: build.query<QuoteBasketView, void>({
			query: () => ({ url: "/quotes/basket", method: "GET" }),
			providesTags: [tagTypes.quote],
		}),

		addToQuoteBasket: build.mutation<
			QuoteBasketView,
			{ variantId: string; quantity: number; note?: string }
		>({
			query: (data) => ({ url: "/quotes/basket/items", method: "POST", data }),
			invalidatesTags: [tagTypes.quote],
		}),

		updateQuoteItem: build.mutation<
			QuoteBasketView,
			{ id: string; quantity: number; note?: string }
		>({
			query: ({ id, ...data }) => ({
				url: `/quotes/basket/items/${id}`,
				method: "PATCH",
				data,
			}),
			invalidatesTags: [tagTypes.quote],
		}),

		removeQuoteItem: build.mutation<QuoteBasketView, string>({
			query: (id) => ({ url: `/quotes/basket/items/${id}`, method: "DELETE" }),
			invalidatesTags: [tagTypes.quote],
		}),

		clearQuoteBasket: build.mutation<QuoteBasketView, void>({
			query: () => ({ url: "/quotes/basket", method: "DELETE" }),
			invalidatesTags: [tagTypes.quote],
		}),

		/** The customer's address book, used to prefill checkout. */
		myAddresses: build.query<SavedAddress[], void>({
			query: () => ({ url: "/account/addresses", method: "GET" }),
			providesTags: [tagTypes.address],
		}),

		me: build.query<AccountProfile, void>({
			query: () => ({ url: "/auth/me", method: "GET" }),
			providesTags: [tagTypes.account],
		}),

		/**
		 * Everything a customer may change about themselves.
		 *
		 * Not email — that has its own flow below, because the address has to prove
		 * it can receive mail before it becomes the one invoices go to. Not role or
		 * status either: what someone is, and whether they may trade, is never
		 * their own decision.
		 *
		 * Editing the VAT number clears its VIES validation server-side, so
		 * reverse charge (R10) cannot be inherited by a number nobody has checked.
		 */
		updateProfile: build.mutation<
			AccountProfile,
			{
				salutation?: string | null
				firstName?: string
				lastName?: string
				company?: string | null
				phone?: string | null
				vatNumber?: string | null
				locale?: string
			}
		>({
			query: (data) => ({ url: "/account/profile", method: "PATCH", data }),
			invalidatesTags: [tagTypes.account, tagTypes.auth],
		}),

		/**
		 * Ask to change the sign-in address.
		 *
		 * Nothing changes when this succeeds. It sends a link to the *new* address
		 * and the account keeps its current one until that link is used — so a typo
		 * costs a resend rather than the account. The current password is required:
		 * the link proves the destination is real, the password proves the request
		 * came from the owner.
		 */
		requestEmailChange: build.mutation<
			{ pendingEmail: string; expiresAt: string },
			{ email: string; currentPassword: string }
		>({
			query: (data) => ({ url: "/account/email", method: "POST", data }),
			invalidatesTags: [tagTypes.account],
		}),

		/** Null when nothing is waiting. Drives the "check your inbox" notice. */
		pendingEmailChange: build.query<{ pendingEmail: string; expiresAt: string } | null, void>({
			query: () => ({ url: "/account/email/pending", method: "GET" }),
			providesTags: [tagTypes.account],
		}),

		cancelEmailChange: build.mutation<null, void>({
			query: () => ({ url: "/account/email/pending", method: "DELETE" }),
			invalidatesTags: [tagTypes.account],
		}),

		/**
		 * Consume the link. Unauthenticated — the token is the authorisation,
		 * because the mailbox is rarely open in the browser that made the request.
		 */
		verifyEmailChange: build.mutation<AccountProfile, string>({
			query: (token) => ({ url: "/account/email/verify", method: "POST", data: { token } }),
			invalidatesTags: [tagTypes.account, tagTypes.auth],
		}),

		createAddress: build.mutation<SavedAddress, Partial<SavedAddress>>({
			query: (data) => ({ url: "/account/addresses", method: "POST", data }),
			invalidatesTags: [tagTypes.address],
		}),

		updateAddress: build.mutation<SavedAddress, { id: string; data: Partial<SavedAddress> }>({
			query: ({ id, data }) => ({ url: `/account/addresses/${id}`, method: "PATCH", data }),
			invalidatesTags: [tagTypes.address],
		}),

		deleteAddress: build.mutation<unknown, string>({
			query: (id) => ({ url: `/account/addresses/${id}`, method: "DELETE" }),
			invalidatesTags: [tagTypes.address],
		}),

		myOrders: build.query<CustomerOrder[], void>({
			query: () => ({ url: "/orders", method: "GET" }),
			providesTags: [tagTypes.order],
		}),

		myOrder: build.query<CustomerOrder, string>({
			query: (id) => ({ url: `/orders/${id}`, method: "GET" }),
			providesTags: (_r, _e, id) => [{ type: tagTypes.order, id }],
		}),

		myQuotes: build.query<CustomerQuote[], void>({
			query: () => ({ url: "/quotes", method: "GET" }),
			providesTags: [tagTypes.quote],
		}),

		myQuote: build.query<CustomerQuote, string>({
			query: (id) => ({ url: `/quotes/${id}`, method: "GET" }),
			providesTags: (_r, _e, id) => [{ type: tagTypes.quote, id }],
		}),

		replyToQuote: build.mutation<unknown, { id: string; body: string }>({
			query: ({ id, body }) => ({ url: `/quotes/${id}/messages`, method: "POST", data: { body } }),
			invalidatesTags: (_r, _e, arg) => [{ type: tagTypes.quote, id: arg.id }],
		}),

		/**
		 * Accepting a quote turns it into an order at the **quoted** prices, not
		 * today's catalogue prices — a quote is an offer the shop made in writing.
		 */
		acceptQuote: build.mutation<
			CustomerOrder,
			{
				id: string
				billingAddress: CheckoutAddress
				shippingAddress?: CheckoutAddress
				paymentMethodId: string
				customerNote?: string
			}
		>({
			query: ({ id, ...data }) => ({ url: `/quotes/${id}/accept`, method: "POST", data }),
			invalidatesTags: [tagTypes.quote, tagTypes.order],
		}),

		/** Eligibility without a cart — used when accepting a quote. */
		availablePaymentMethods: build.query<
			AvailablePaymentMethod[],
			{ orderTotal: number; countryCode: string }
		>({
			query: (params) => ({ url: "/payment-methods/available", method: "GET", params }),
			providesTags: [tagTypes.payment],
		}),

		/**
		 * The wishlist is optionalAuth, like the baskets — a guest may build one
		 * before deciding to register.
		 */
		wishlist: build.query<WishlistView, void>({
			query: () => ({ url: "/wishlist", method: "GET" }),
			providesTags: [tagTypes.wishlist],
		}),

		addToWishlist: build.mutation<WishlistView, string>({
			query: (variantId) => ({ url: "/wishlist/items", method: "POST", data: { variantId } }),
			invalidatesTags: [tagTypes.wishlist],
		}),

		removeFromWishlist: build.mutation<WishlistView, string>({
			query: (variantId) => ({ url: `/wishlist/items/${variantId}`, method: "DELETE" }),
			invalidatesTags: [tagTypes.wishlist],
		}),

		/**
		 * Totals for a prospective order. A mutation rather than a query because
		 * it POSTs an address and nothing about it is worth caching — the answer
		 * depends on the cart, the address and the chosen method, all of which
		 * move while the customer is on the page.
		 */
		checkoutPreview: build.mutation<
			CheckoutPreview,
			{
				billingAddress?: Partial<CheckoutAddress>
				shippingAddress?: Partial<CheckoutAddress>
				shippingMethodId?: string
				vatNumber?: string
			}
		>({
			query: (data) => ({ url: "/checkout/preview", method: "POST", data }),
		}),

		/** R7 lives here: the endpoint is auth()-only, never optionalAuth. */
		placeOrder: build.mutation<PlacedOrder, PlaceOrderPayload>({
			query: (data) => ({ url: "/checkout", method: "POST", data }),
			invalidatesTags: [tagTypes.cart, tagTypes.order],
		}),

		/**
		 * Turns the basket into an actual inquiry. Guests may submit — that is
		 * the point of a quote — so this stays optionalAuth on the server and the
		 * contact fields carry who to reply to.
		 */
		submitQuote: build.mutation<{ id: string; reference?: string }, QuoteSubmission>({
			query: (data) => ({ url: "/quotes/basket/submit", method: "POST", data }),
			invalidatesTags: [tagTypes.quote],
		}),

		/**
		 * Double opt-in: this only sends the confirmation email. Nothing is
		 * mailable until the recipient clicks the link, which is what makes the
		 * list legal to use.
		 */
		subscribeNewsletter: build.mutation<
			unknown,
			{ email: string; name?: string; source?: string }
		>({
			query: (data) => ({ url: "/newsletter/subscribe", method: "POST", data }),
			invalidatesTags: [tagTypes.newsletter],
		}),

		/**
		 * The contact form. `website` is the honeypot — the API answers 201 to a
		 * bot exactly as it does to a person, because telling a spammer their
		 * submission was binned only teaches them to try again.
		 */
		submitContact: build.mutation<
			unknown,
			{
				name: string
				email: string
				message: string
				phone?: string
				company?: string
				subject?: string
				website?: string
			}
		>({
			query: (data) => ({ url: "/contact", method: "POST", data }),
			invalidatesTags: [tagTypes.contact],
		}),
	}),
})

export const {
	useShopProductsQuery,
	useShopProductQuery,
	// Options carry their product slug but not a variant id, so adding one to
	// the cart means looking its default variant up on demand.
	useLazyShopProductQuery,
	useShopCategoriesQuery,
	useShopCategoryQuery,

	useCartQuery,
	useAddToCartMutation,
	useUpdateCartItemMutation,
	useRemoveCartItemMutation,
	useClearCartMutation,

	useMyAddressesQuery,
	useCheckoutPreviewMutation,
	usePlaceOrderMutation,

	useMeQuery,
	useUpdateProfileMutation,
	useRequestEmailChangeMutation,
	usePendingEmailChangeQuery,
	useCancelEmailChangeMutation,
	useVerifyEmailChangeMutation,
	useCreateAddressMutation,
	useUpdateAddressMutation,
	useDeleteAddressMutation,
	useMyOrdersQuery,
	useMyOrderQuery,
	useMyQuotesQuery,
	useMyQuoteQuery,
	useReplyToQuoteMutation,
	useAcceptQuoteMutation,
	useAvailablePaymentMethodsQuery,
	useWishlistQuery,
	useAddToWishlistMutation,
	useRemoveFromWishlistMutation,

	useQuoteBasketQuery,
	useAddToQuoteBasketMutation,
	useUpdateQuoteItemMutation,
	useRemoveQuoteItemMutation,
	useClearQuoteBasketMutation,
	useSubmitQuoteMutation,

	useSubscribeNewsletterMutation,
	useSubmitContactMutation,
} = storefrontApi
