import { useDispatch, useSelector, useStore } from "react-redux"
import type { AppDispatch, RootState, store } from "./store"

/** Typed wrappers — use these instead of the plain react-redux hooks. */
export const useAppDispatch = useDispatch.withTypes<AppDispatch>()
export const useAppSelector = useSelector.withTypes<RootState>()
export const useAppStore = useStore.withTypes<typeof store>()
