import type { IMeta } from "@/types"
import type {
	PublicCategory,
	PublicProduct,
	PublicProductListParams,
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

		shopCategories: build.query<PublicCategory[], { tree?: boolean } | void>({
			query: (params) => ({
				url: "/categories",
				method: "GET",
				params: params ?? { tree: true },
			}),
			providesTags: [tagTypes.category],
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
	useShopCategoriesQuery,
	useSubscribeNewsletterMutation,
	useSubmitContactMutation,
} = storefrontApi
