import type { IMeta } from "@/types"
import type { AssignableRole, Customer, CustomerListParams } from "@/types/customer"
import { tagTypes } from "../tag-types"
import { baseApi } from "./baseApi"

export const customerApi = baseApi.injectEndpoints({
	endpoints: (build) => ({
		customers: build.query<{ data: Customer[]; meta?: IMeta }, CustomerListParams>({
			query: (params) => ({ url: "/users", method: "GET", params }),
			transformResponse: (rows: Customer[], meta?: IMeta) => ({ data: rows, meta }),
			providesTags: [tagTypes.user],
		}),

		customer: build.query<Customer, string>({
			query: (id) => ({ url: `/users/${id}`, method: "GET" }),
			providesTags: [tagTypes.user],
		}),

		/**
		 * Approve / reject also govern wholesale pricing (R5b), so they touch the
		 * b2b queue too — the same decision is visible on both screens.
		 */
		approveCustomer: build.mutation<Customer, string>({
			query: (id) => ({ url: `/users/${id}/approve`, method: "PATCH" }),
			invalidatesTags: [tagTypes.user, tagTypes.b2b],
		}),

		rejectCustomer: build.mutation<Customer, string>({
			query: (id) => ({ url: `/users/${id}/reject`, method: "PATCH" }),
			invalidatesTags: [tagTypes.user, tagTypes.b2b],
		}),

		/** ADMIN only on the server — a shop manager cannot make someone an admin. */
		setCustomerRole: build.mutation<Customer, { id: string; role: AssignableRole }>({
			query: ({ id, role }) => ({ url: `/users/${id}/role`, method: "PATCH", data: { role } }),
			invalidatesTags: [tagTypes.user],
		}),
	}),
})

export const {
	useCustomersQuery,
	useCustomerQuery,
	useApproveCustomerMutation,
	useRejectCustomerMutation,
	useSetCustomerRoleMutation,
} = customerApi
