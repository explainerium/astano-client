import type { ReactNode } from "react"
import Sidebar from "./Sidebar"
import Topbar from "./Topbar"

/**
 * The dashboard frame: a fixed sidebar and topbar, with only the content
 * scrolling.
 *
 * `h-screen` and `overflow-hidden` are what make that true, and they replaced a
 * `min-h-screen` that quietly did the opposite. With only a minimum, the shell
 * grew to whatever the page needed and the *document* scrolled — so the sidebar
 * rode up out of view on a long product list, leaving the page background
 * showing beneath it, and the nav's own `overflow-y-auto` never had a height to
 * scroll within.
 *
 * Now the shell is exactly the viewport, the sidebar keeps its own scroll for
 * when the menu outgrows a short screen, and `main` is the only thing that
 * moves.
 */
export const DashboardShell = ({ children }: { children: ReactNode }) => (
	// `h-full`, not `h-screen`. The root layout already pins html and body to the
	// viewport, so filling the parent is both simpler and correct on mobile,
	// where 100vh famously counts browser chrome that is not there.
	<div className="bg-background flex h-full overflow-hidden">
		<Sidebar />
		{/* min-w-0 so wide tables and charts scroll inside the column rather than
		    stretching the whole page. */}
		<div className="flex min-w-0 flex-1 flex-col overflow-hidden">
			<Topbar />
			{/*
			 * The scroll container for everything below the topbar.
			 *
			 * `overscroll-contain` stops a flick at the end of a long table from
			 * carrying on into the page behind it, which on a trackpad reads as the
			 * whole dashboard sliding.
			 */}
			<main className="flex-1 overflow-y-auto overscroll-contain px-6 pb-8 lg:px-8">
				{children}
			</main>
		</div>
	</div>
)

export default DashboardShell
