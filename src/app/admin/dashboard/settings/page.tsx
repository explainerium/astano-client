import { redirect } from "next/navigation"

/**
 * /settings has no content of its own — it opens on the first section.
 *
 * Company is the landing because it is the one that has to be filled in before
 * the shop can issue an invoice, and on a fresh install it is empty.
 */
export default function SettingsPage() {
	redirect("/admin/dashboard/settings/company")
}
