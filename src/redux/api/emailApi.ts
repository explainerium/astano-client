import type { EmailOverride, EmailPreview, EmailTemplate } from "@/types/email"
import { tagTypes } from "../tag-types"
import { baseApi } from "./baseApi"

export const emailApi = baseApi.injectEndpoints({
	endpoints: (build) => ({
		emailTemplates: build.query<EmailTemplate[], void>({
			query: () => ({ url: "/admin/emails", method: "GET" }),
			providesTags: [tagTypes.email],
		}),

		emailTemplate: build.query<EmailTemplate, string>({
			query: (kind) => ({ url: `/admin/emails/${kind}`, method: "GET" }),
			providesTags: [tagTypes.email],
		}),

		/**
		 * The rendered message.
		 *
		 * Tagged with `setting` as well as `email`: the branding lives in the
		 * settings, so saving a colour has to invalidate every preview or the
		 * admin changes one and sees the old one.
		 */
		emailPreview: build.query<EmailPreview, { kind: string; locale: string }>({
			query: ({ kind, locale }) => ({
				url: `/admin/emails/${kind}/preview`,
				method: "GET",
				params: { locale },
			}),
			providesTags: [tagTypes.email, tagTypes.setting],
		}),

		saveEmailTemplate: build.mutation<EmailTemplate, { kind: string; data: EmailOverride }>({
			query: ({ kind, data }) => ({ url: `/admin/emails/${kind}`, method: "PUT", data }),
			invalidatesTags: [tagTypes.email],
		}),

		resetEmailTemplate: build.mutation<EmailTemplate, string>({
			query: (kind) => ({ url: `/admin/emails/${kind}`, method: "DELETE" }),
			invalidatesTags: [tagTypes.email],
		}),

		sendEmailTest: build.mutation<
			{ sent: true; to: string },
			{ kind: string; to: string; locale: string }
		>({
			query: ({ kind, ...data }) => ({
				url: `/admin/emails/${kind}/test`,
				method: "POST",
				data,
			}),
		}),
	}),
})

export const {
	useEmailTemplatesQuery,
	useEmailTemplateQuery,
	useEmailPreviewQuery,
	useSaveEmailTemplateMutation,
	useResetEmailTemplateMutation,
	useSendEmailTestMutation,
} = emailApi
