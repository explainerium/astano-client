import type { ReactNode } from "react"
import Sidebar from "./Sidebar"
import Topbar from "./Topbar"

export const DashboardShell = ({ children }: { children: ReactNode }) => (
	<div className="bg-background flex min-h-screen">
		<Sidebar />
		{/* min-w-0 so wide tables and charts scroll inside the column rather than
		    stretching the whole page. */}
		<div className="flex min-w-0 flex-1 flex-col">
			<Topbar />
			<main className="flex-1 px-6 pb-8 lg:px-8">{children}</main>
		</div>
	</div>
)

export default DashboardShell
