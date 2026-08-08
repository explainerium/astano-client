import { baseApi } from "./api/baseApi"
import { compareReducer } from "./slices/compareSlice"

/**
 * Two kinds of state, deliberately kept apart.
 *
 * `baseApi` holds every server-owned thing — cart, catalogue, orders — cached
 * here and never authored here. `compare` is the one genuinely client-owned
 * thing in the shop: a handful of product ids nobody else needs to know about.
 *
 * See `compareSlice` for why the cart is not sitting next to it.
 */
export const reducer = {
	[baseApi.reducerPath]: baseApi.reducer,
	compare: compareReducer,
}
