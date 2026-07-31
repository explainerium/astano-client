import { redirect } from "next/navigation"

/** /admin is not a page of its own — the dashboard is the landing screen. */
export default function AdminIndex() {
	redirect("/admin/dashboard")
}
