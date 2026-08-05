import type { IMeta } from "@/types"
import type {
	CartView,
	CheckoutAddress,
	CheckoutPreview,
	PlacedOrder,
	PlaceOrderPayload,
	PublicCategory,
	PublicProduct,
	PublicProductDetail,
	PublicProductListParams,
	QuoteBasketView,
	QuoteSubmission,
	SavedAddress,
} from "@/types/storefront"
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
		shopProducts: build.query<{ data: PublicProduct[]; meta?: IMeta }, PublicProductListParams>({
			query: (params) => ({ url: "/products", method: "GET", params }),
			transformResponse: (rows: PublicProduct[], meta?: IMeta) => ({ data: rows, meta }),
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
		cart: build.query<CartView, void>({
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
		}),

		removeCartItem: build.mutation<CartView, string>({
			query: (id) => ({ url: `/cart/items/${id}`, method: "DELETE" }),
			invalidatesTags: [tagTypes.cart],
		}),

		clearCart: build.mutation<CartView, void>({
			query: () => ({ url: "/cart", method: "DELETE" }),
			invalidatesTags: [tagTypes.cart],
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

	useCartQuery,
	useAddToCartMutation,
	useUpdateCartItemMutation,
	useRemoveCartItemMutation,
	useClearCartMutation,

	useMyAddressesQuery,
	useCheckoutPreviewMutation,
	usePlaceOrderMutation,

	useQuoteBasketQuery,
	useAddToQuoteBasketMutation,
	useUpdateQuoteItemMutation,
	useRemoveQuoteItemMutation,
	useClearQuoteBasketMutation,
	useSubmitQuoteMutation,

	useSubscribeNewsletterMutation,
	useSubmitContactMutation,
} = storefrontApi
