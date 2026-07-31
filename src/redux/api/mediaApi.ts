import type { IMeta } from "@/types"
import type { MediaAsset, MediaFolder, MediaListParams } from "@/types/media"
import { tagTypes } from "../tag-types"
import { baseApi } from "./baseApi"

export const mediaApi = baseApi.injectEndpoints({
	endpoints: (build) => ({
		media: build.query<{ data: MediaAsset[]; meta?: IMeta }, MediaListParams>({
			query: (params) => ({ url: "/media", method: "GET", params }),
			/**
			 * axiosBaseQuery returns { data, meta }, so RTK Query passes the page
			 * meta as transformResponse's second argument. Recombined here — the
			 * grid needs the rows and the total together.
			 */
			transformResponse: (rows: MediaAsset[], meta?: IMeta) => ({
				data: rows,
				meta,
			}),
			providesTags: [tagTypes.media],
		}),

		mediaFolders: build.query<MediaFolder[], void>({
			query: () => ({ url: "/media/folders/all", method: "GET" }),
			providesTags: [tagTypes.mediaFolder],
		}),

		createMediaFolder: build.mutation<MediaFolder, { name: string; parentId?: string | null }>({
			query: (data) => ({ url: "/media/folders", method: "POST", data }),
			invalidatesTags: [tagTypes.mediaFolder],
		}),

		deleteMediaFolder: build.mutation<void, string>({
			query: (id) => ({ url: `/media/folders/${id}`, method: "DELETE" }),
			invalidatesTags: [tagTypes.mediaFolder, tagTypes.media],
		}),

		/**
		 * Upload. FormData, not JSON — the file is a binary part, and the folder
		 * travels in the same multipart body so an image is filed the moment it
		 * lands rather than needing a second call.
		 */
		uploadImage: build.mutation<MediaAsset, { file: File; folderId?: string | null; alt?: string }>({
			query: ({ file, folderId, alt }) => {
				const form = new FormData()
				form.append("file", file)
				if (folderId) form.append("folderId", folderId)
				if (alt) form.append("alt", alt)

				// contentType undefined so the browser sets the multipart boundary
				// itself — setting it by hand strips the boundary and the upload fails.
				return { url: "/media/images", method: "POST", data: form, contentType: undefined }
			},
			invalidatesTags: [tagTypes.media, tagTypes.mediaFolder],
		}),

		updateMedia: build.mutation<
			MediaAsset,
			{ id: string; data: { folderId?: string | null; alt?: string; caption?: string } }
		>({
			query: ({ id, data }) => ({ url: `/media/${id}`, method: "PATCH", data }),
			invalidatesTags: [tagTypes.media, tagTypes.mediaFolder],
		}),

		deleteMedia: build.mutation<void, string>({
			query: (id) => ({ url: `/media/${id}`, method: "DELETE" }),
			invalidatesTags: [tagTypes.media, tagTypes.mediaFolder],
		}),
	}),
})

export const {
	useMediaQuery,
	useMediaFoldersQuery,
	useCreateMediaFolderMutation,
	useDeleteMediaFolderMutation,
	useUploadImageMutation,
	useUpdateMediaMutation,
	useDeleteMediaMutation,
} = mediaApi
