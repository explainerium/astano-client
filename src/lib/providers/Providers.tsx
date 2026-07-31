"use client"

import type { ReactNode } from "react"
import { Provider as ReduxProvider } from "react-redux"
import { ThemeProvider } from "next-themes"
import { Toaster } from "sonner"
import { store } from "@/redux/store"

/**
 * Client-side providers, mounted once per root layout.
 *
 * The storefront palette is a light monochrome scheme (spec §6.1) with no dark
 * variant, so system preference is ignored rather than flipping the shop to
 * colours the brand does not have. next-themes stays mounted because the admin
 * dashboard may want a dark mode later; switching it on is a prop change.
 */
export const Providers = ({ children }: { children: ReactNode }) => (
	<ReduxProvider store={store}>
		<ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
			{children}
			<Toaster richColors closeButton position="top-right" />
		</ThemeProvider>
	</ReduxProvider>
)

export default Providers
