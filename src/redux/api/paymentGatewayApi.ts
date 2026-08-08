import { tagTypes } from "../tag-types"
import { baseApi } from "./baseApi"
import type {
	ConnectionTestResult,
	GatewayMode,
	GatewayProvider,
	PaymentGatewayView,
} from "@/types/paymentGateway"

/**
 * Payment provider configuration.
 *
 * Credentials only ever travel one way. There is no endpoint that reads a key
 * back, so nothing in this slice can accidentally put one on screen.
 */
export const paymentGatewayApi = baseApi.injectEndpoints({
	endpoints: (build) => ({
		paymentGateways: build.query<PaymentGatewayView[], void>({
			query: () => ({ url: "/admin/payment-gateways", method: "GET" }),
			providesTags: [tagTypes.payment],
		}),

		paymentGateway: build.query<PaymentGatewayView, GatewayProvider>({
			query: (provider) => ({ url: `/admin/payment-gateways/${provider}`, method: "GET" }),
			providesTags: [tagTypes.payment],
		}),

		/**
		 * An omitted field keeps what is stored; `null` clears it.
		 *
		 * The form cannot show a saved secret, so leaving a box empty is the normal
		 * state — sending "" for it would wipe a working key every time somebody
		 * edited the field beside it.
		 */
		saveGatewayCredentials: build.mutation<
			PaymentGatewayView,
			{ provider: GatewayProvider; mode: GatewayMode; credentials: Record<string, string | null> }
		>({
			query: ({ provider, ...data }) => ({
				url: `/admin/payment-gateways/${provider}/credentials`,
				method: "PUT",
				data,
			}),
			invalidatesTags: [tagTypes.payment],
		}),

		/**
		 * Calls the provider for real and returns what they said.
		 *
		 * A failure comes back as `{ ok: false, message }` with a 200, not as an
		 * error — the request worked, the answer was no, and that answer is the
		 * useful part.
		 */
		testGatewayConnection: build.mutation<
			ConnectionTestResult,
			{ provider: GatewayProvider; mode: GatewayMode }
		>({
			query: ({ provider, mode }) => ({
				url: `/admin/payment-gateways/${provider}/test`,
				method: "POST",
				data: { mode },
			}),
			invalidatesTags: [tagTypes.payment],
		}),

		updateGatewaySettings: build.mutation<
			PaymentGatewayView,
			{
				provider: GatewayProvider
				isActive?: boolean
				mode?: GatewayMode
				enabledMethods?: string[]
			}
		>({
			query: ({ provider, ...data }) => ({
				url: `/admin/payment-gateways/${provider}`,
				method: "PATCH",
				data,
			}),
			invalidatesTags: [tagTypes.payment],
		}),
	}),
})

export const {
	usePaymentGatewaysQuery,
	usePaymentGatewayQuery,
	useSaveGatewayCredentialsMutation,
	useTestGatewayConnectionMutation,
	useUpdateGatewaySettingsMutation,
} = paymentGatewayApi
