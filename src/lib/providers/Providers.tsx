"use client"

import type { ReactNode } from "react"
import { Provider as ReduxProvider } from "react-redux"
import { Toaster } from "sonner"
import { store } from "@/redux/store"

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
		{children}
		{/* Pinned rather than left to the default: sonner is the one component
		    that would still follow the OS, and its `system` setting would paint
		    dark toasts over a shop that has no dark palette. */}
		<Toaster theme="light" richColors closeButton position="top-right" />
	</ReduxProvider>
)

export default Providers
