import type { ReactNode } from "react"
import DashboardShell from "@/components/dashboard/shell/DashboardShell"

/**
 * Wraps every dashboard route in the sidebar + topbar shell.
 *
 * No auth check here — the proxy guard has already refused anyone who is not an
 * ACTIVE ADMIN or SHOP_MANAGER before this renders, and the API refuses them
 * again on every request.
 */
export default function DashboardLayout({ children }: { children: ReactNode }) {
	return <DashboardShell>{children}</DashboardShell>
}
