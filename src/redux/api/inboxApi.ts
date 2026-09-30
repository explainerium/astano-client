import type { IMeta } from "@/types"
import type {
	ContactListParams,
	ContactMessage,
	NewsletterListParams,
	NewsletterSubscriber,
	SubscriptionStatus,
} from "@/types/inbox"
import { tagTypes } from "../tag-types"
import { baseApi } from "./baseApi"

export const inboxApi = baseApi.injectEndpoints({
	endpoints: (build) => ({
		contactMessages: build.query<{ data: ContactMessage[]; meta?: IMeta }, ContactListParams>({
			query: (params) => ({ url: "/admin/contact", method: "GET", params }),
			transformResponse: (rows: ContactMessage[], meta?: IMeta) => ({ data: rows, meta }),
			providesTags: [tagTypes.contact],
		}),

		/** One-way: there is no "un-handle", by design — it is a record, not a toggle. */
		markContactHandled: build.mutation<ContactMessage, { id: string; note?: string }>({
			query: ({ id, note }) => ({
				url: `/admin/contact/${id}/handled`,
				method: "PATCH",
				data: note ? { note } : {},
			}),
			invalidatesTags: [tagTypes.contact],
		}),

		newsletterSubscribers: build.query<
			{ data: NewsletterSubscriber[]; meta?: IMeta },
			NewsletterListParams
		>({
			query: (params) => ({ url: "/admin/newsletter", method: "GET", params }),
			transformResponse: (rows: NewsletterSubscriber[], meta?: IMeta) => ({ data: rows, meta }),
			providesTags: [tagTypes.newsletter],
		}),

		/** How many of each status — the boxes above the list. */
		newsletterCounts: build.query<Record<SubscriptionStatus, number>, void>({
			query: () => ({ url: "/admin/newsletter/counts", method: "GET" }),
			providesTags: [tagTypes.newsletter],
		}),

		/**
		 * Takes one address off the list, and out of CleverReach if connected.
		 * One way only: putting somebody back needs their own confirmation.
		 */
		unsubscribeSubscriber: build.mutation<unknown, string>({
			query: (id) => ({ url: `/admin/newsletter/${id}/unsubscribe`, method: "POST" }),
			invalidatesTags: [tagTypes.newsletter],
		}),
	}),
})

export const {
	useContactMessagesQuery,
	useMarkContactHandledMutation,
	useNewsletterSubscribersQuery,
	useNewsletterCountsQuery,
	useUnsubscribeSubscriberMutation,
} = inboxApi
