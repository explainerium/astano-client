"use client"

import type { CSSProperties, ReactNode } from "react"
import { Provider as ReduxProvider } from "react-redux"
import { Toaster } from "sonner"
import { store } from "@/redux/store"
import MoneyFormatProvider from "./MoneyFormatProvider"

/**
 * Client-side providers, mounted once per root layout.
 *
 * There is no theme provider. astano has one palette — the light monochrome
 * scheme of spec §6.1 for the shop, and the warm orange dashboard theme scoped
 * to /admin. A dark variant was never designed, so the machinery for switching
 * to one only ever produced conflicts: components carrying dark: styles that
 * nothing was meant to trigger, and a class on <html> that had to be written
 * before hydration to avoid a mismatch.
 *
 * If a dark mode is ever wanted it needs designing first, not toggling on.
 */
export const Providers = ({ children }: { children: ReactNode }) => (
	<ReduxProvider store={store}>
		{/* Renders nothing — it teaches formatMoney the shop's currency and
		    separators. Inside the Redux provider because it reads them from the
		    API; before the children so prices format correctly on first paint. */}
		<MoneyFormatProvider />
		{children}
		{/*
		 * Pinned rather than left to the default: sonner is the one component
		 * that would still follow the OS, and its `system` setting would paint
		 * dark toasts over a shop that has no dark palette.
		 *
		 * Centred at the top, a little larger, and held a second longer than the
		 * defaults — because "I saved that, did it work?" was going unanswered.
		 * A 356px card at 13px in the far corner, gone in four seconds, is easy
		 * to miss while your eye is still on the button you pressed. The colours
		 * are sonner's own; only the size, the dwell and the place changed.
		 */}
		<Toaster
			theme="light"
			richColors
			closeButton
			position="top-center"
			duration={5000}
			// Width is a custom property on the container; the rest is per toast.
			// Inline rather than classes, so sonner's own rules — which match on
			// [data-sonner-toast] and carry the same specificity as a class —
			// cannot win depending on stylesheet order.
			style={{ "--width": "420px" } as CSSProperties}
			toastOptions={{ style: { fontSize: "14px", padding: "18px" } }}
		/>
	</ReduxProvider>
)

export default Providers
