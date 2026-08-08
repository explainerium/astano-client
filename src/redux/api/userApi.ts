import { tagTypes } from "../tag-types"
import { baseApi } from "./baseApi"
import type {
	AdminUser,
	AdminUserDetail,
	AssignableRole,
	AssignableStatus,
	UserListMeta,
	UserListParams,
} from "@/types/user"

/**
 * Every account, one slice.
 *
 * This replaces customerApi and dealerApi. They were two clients for one table:
 * the "dealer" endpoints read the application, the "customer" ones read the row
 * the application belongs to, and approving on either screen changed the same
 * field. Whether somebody is a retail buyer or a dealer is a value in a column,
 * not a different kind of thing.
 */
export const userApi = baseApi.injectEndpoints({
	endpoints: (build) => ({
		users: build.query<{ data: AdminUser[]; meta?: UserListMeta }, UserListParams>({
			query: (params) => ({
				url: "/users",
				method: "GET",
				// Only send `deleted` when it is true — the API defaults to the live
				// list, and "deleted=false" in the URL reads like a filter that is
				// doing something.
				params: { ...params, deleted: params.deleted ? "true" : undefined },
			}),
			transformResponse: (rows: AdminUser[], meta?: UserListMeta) => ({ data: rows, meta }),
			providesTags: [tagTypes.user],
		}),

		user: build.query<AdminUserDetail, string>({
			query: (id) => ({ url: `/users/${id}`, method: "GET" }),
			providesTags: (_result, _error, id) => [{ type: tagTypes.user, id }, tagTypes.user],
		}),

		/**
		 * Approve or reject an account.
		 *
		 * Both flip the user's status and email the applicant, so both invalidate
		 * b2b as well — the same decision is what the dealer queue was showing.
		 */
		approveUser: build.mutation<AdminUser, string>({
			query: (id) => ({ url: `/users/${id}/approve`, method: "PATCH" }),
			invalidatesTags: [tagTypes.user, tagTypes.b2b],
		}),

		rejectUser: build.mutation<AdminUser, string>({
			query: (id) => ({ url: `/users/${id}/reject`, method: "PATCH" }),
			invalidatesTags: [tagTypes.user, tagTypes.b2b],
		}),

		/**
		 * Records the decision *and* the note against the application.
		 *
		 * Preferred over approveUser/rejectUser whenever there is an application to
		 * annotate: it does everything they do and additionally leaves a trail of
		 * who decided and why. Accounts that never applied have nothing to annotate,
		 * which is what the plain pair above is for.
		 */
		decideDealer: build.mutation<unknown, { id: string; approve: boolean; note?: string }>({
			query: ({ id, ...data }) => ({
				url: `/admin/b2b/${id}/decision`,
				method: "PATCH",
				data,
			}),
			invalidatesTags: [tagTypes.b2b, tagTypes.user],
		}),

		/** Activate, suspend or draft. ADMIN or SHOP_MANAGER; never your own row. */
		setUserStatus: build.mutation<AdminUser, { id: string; status: AssignableStatus }>({
			query: ({ id, status }) => ({
				url: `/users/${id}/status`,
				method: "PATCH",
				data: { status },
			}),
			invalidatesTags: [tagTypes.user, tagTypes.b2b],
		}),

		/** ADMIN only on the server — a shop manager cannot make someone an admin. */
		setUserRole: build.mutation<AdminUser, { id: string; role: AssignableRole }>({
			query: ({ id, role }) => ({ url: `/users/${id}/role`, method: "PATCH", data: { role } }),
			invalidatesTags: [tagTypes.user],
		}),

		/** Reversible. This is the delete the screen offers. */
		deleteUser: build.mutation<AdminUser, string>({
			query: (id) => ({ url: `/users/${id}`, method: "DELETE" }),
			invalidatesTags: [tagTypes.user, tagTypes.b2b],
		}),

		restoreUser: build.mutation<AdminUser, string>({
			query: (id) => ({ url: `/users/${id}/restore`, method: "PATCH" }),
			invalidatesTags: [tagTypes.user, tagTypes.b2b],
		}),

		/**
		 * Irreversible, ADMIN only. Orders survive without their customer — which
		 * is exactly why the reversible one above exists.
		 */
		purgeUser: build.mutation<{ id: string }, string>({
			query: (id) => ({ url: `/users/${id}/permanent`, method: "DELETE" }),
			invalidatesTags: [tagTypes.user, tagTypes.b2b, tagTypes.order],
		}),
	}),
})

export const {
	useUsersQuery,
	useUserQuery,
	useApproveUserMutation,
	useRejectUserMutation,
	useDecideDealerMutation,
	useSetUserStatusMutation,
	useSetUserRoleMutation,
	useDeleteUserMutation,
	useRestoreUserMutation,
	usePurgeUserMutation,
} = userApi
