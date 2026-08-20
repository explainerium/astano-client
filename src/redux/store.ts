import { configureStore } from "@reduxjs/toolkit"
import { setupListeners } from "@reduxjs/toolkit/query"
import { baseApi } from "./api/baseApi"
import { reducer } from "./rootReducer"

export const store = configureStore({
	reducer,
	middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(baseApi.middleware),
})

/**
 * Lets an endpoint ask to be refetched when the tab is looked at again.
 *
 * Nothing refetches because of this on its own — an endpoint has to opt in with
 * `refetchOnFocus`. Without it that flag is silently inert, which is how the
 * category menu came to be fetched once per page load and then never again: an
 * admin hid a category, switched to the shop tab, and it was still in the menu
 * because nothing had asked the server since the tab was opened.
 */
setupListeners(store.dispatch)

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
