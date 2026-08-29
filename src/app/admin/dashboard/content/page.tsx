import { redirect } from "next/navigation"

/**
 * /content has no fields of its own — it opens on the home page.
 *
 * Which is the one anybody comes here to change: it is what a visitor sees
 * first, and the only page whose hero and banner tiles nothing else can reach.
 */
export default function ContentPage() {
	redirect("/admin/dashboard/content/home")
}
