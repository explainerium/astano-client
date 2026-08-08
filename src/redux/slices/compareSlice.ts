import { createSlice, type PayloadAction } from "@reduxjs/toolkit"

/**
 * The compare tray.
 *
 * A local Redux slice, and the contrast with the cart is the point. A cart is
 * an *order in progress*: its prices are role- and quantity-resolved, its lines
 * are re-validated against stock and MOQ, and it must survive a change of
 * device — so it lives in the database and the browser only caches it.
 *
 * A comparison is none of those things. It is a handful of product ids someone
 * is holding in their head for the next thirty seconds. Nothing is priced,
 * nothing is reserved, nothing is owed. Putting it in the database would mean a
 * row, a token, a sweep job and a round trip per click, all to remember three
 * ids. This is the case a client-side slice is actually for.
 *
 * Persisted to localStorage so a page reload does not empty the tray, which is
 * the one thing that would make it useless.
 */

const STORAGE_KEY = "astano_compare"

/**
 * Four, matching the live shop's own table.
 *
 * A comparison table is read across, and past four columns it stops being
 * readable on anything narrower than a desktop. Adding a fifth drops the oldest
 * rather than refusing — a silent no-op on a click is worse than a visible
 * swap.
 */
export const COMPARE_LIMIT = 4

interface CompareState {
	ids: string[]
	/** False until the browser's copy has been read, so SSR and the first client
	 *  render agree. Rendering a tray from localStorage during hydration is the
	 *  classic mismatch. */
	hydrated: boolean
}

const initialState: CompareState = { ids: [], hydrated: false }

const persist = (ids: string[]) => {
	if (typeof window === "undefined") return
	try {
		window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
	} catch {
		// Private mode, or a full quota. A comparison that forgets itself is a
		// small loss; a checkout that throws because of it is not.
	}
}

export const readStoredCompare = (): string[] => {
	if (typeof window === "undefined") return []
	try {
		const raw = window.localStorage.getItem(STORAGE_KEY)
		const parsed = raw ? (JSON.parse(raw) as unknown) : []
		return Array.isArray(parsed)
			? parsed.filter((v): v is string => typeof v === "string").slice(0, COMPARE_LIMIT)
			: []
	} catch {
		return []
	}
}

const compareSlice = createSlice({
	name: "compare",
	initialState,
	reducers: {
		hydrateCompare: (state, action: PayloadAction<string[]>) => {
			state.ids = action.payload.slice(0, COMPARE_LIMIT)
			state.hydrated = true
		},

		toggleCompare: (state, action: PayloadAction<string>) => {
			const id = action.payload

			if (state.ids.includes(id)) {
				state.ids = state.ids.filter((x) => x !== id)
			} else {
				// Oldest out when the tray is full — see COMPARE_LIMIT.
				state.ids = [...state.ids, id].slice(-COMPARE_LIMIT)
			}

			persist(state.ids)
		},

		removeFromCompare: (state, action: PayloadAction<string>) => {
			state.ids = state.ids.filter((x) => x !== action.payload)
			persist(state.ids)
		},

		clearCompare: (state) => {
			state.ids = []
			persist(state.ids)
		},
	},
})

export const { hydrateCompare, toggleCompare, removeFromCompare, clearCompare } =
	compareSlice.actions

export const compareReducer = compareSlice.reducer
