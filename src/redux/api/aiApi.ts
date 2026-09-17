import type {
	AiGenerateInput,
	AiGenerateResult,
	AiStatus,
	AiTestResult,
	AiTranslateInput,
} from "@/types/ai"
import { tagTypes } from "../tag-types"
import { baseApi } from "./baseApi"

/**
 * The assistant that drafts catalogue text.
 *
 * Every call spends the shop's own credit, so nothing here is speculative: the
 * status query decides whether a button is shown at all, and the two mutations
 * only ever run because somebody pressed one.
 */
export const aiApi = baseApi.injectEndpoints({
	endpoints: (build) => ({
		/**
		 * Whether the feature is on and a key is stored.
		 *
		 * Tagged with `setting` so saving the AI settings refreshes it — otherwise
		 * the editor keeps hiding the button until a reload, which reads as the
		 * key not having saved.
		 */
		aiStatus: build.query<AiStatus, void>({
			query: () => ({ url: "/admin/ai", method: "GET" }),
			providesTags: [tagTypes.setting],
		}),

		/**
		 * Writes one piece of text. Long timeout: a model thinking about a German
		 * product description takes seconds, not milliseconds, and giving up early
		 * bills for work whose answer is then thrown away.
		 */
		generateText: build.mutation<AiGenerateResult, AiGenerateInput>({
			query: (data) => ({ url: "/admin/ai/generate", method: "POST", data, timeout: 120_000 }),
		}),

		/**
		 * One field, in the other language.
		 *
		 * One call per field rather than one for the whole form: a product's name
		 * and its description are different shapes — one plain, one HTML — and a
		 * single request returning both would have to invent a wrapper format for
		 * the model to fill in and this side to take apart again.
		 */
		translateText: build.mutation<AiGenerateResult, AiTranslateInput>({
			query: (data) => ({ url: "/admin/ai/translate", method: "POST", data, timeout: 120_000 }),
		}),

		/** One tiny real request, to find out whether the stored key works. */
		testAiKey: build.mutation<AiTestResult, void>({
			query: () => ({ url: "/admin/ai/test", method: "POST", timeout: 60_000 }),
		}),
	}),
})

export const {
	useAiStatusQuery,
	useGenerateTextMutation,
	useTranslateTextMutation,
	useTestAiKeyMutation,
} = aiApi
