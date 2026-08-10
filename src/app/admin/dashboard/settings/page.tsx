import { redirect } from "next/navigation"

/**
 * /settings has no content of its own — it opens on one group.
 *
 * The business address, which is no longer the first entry in the menu but is
 * still the right landing: it is the one that has to be filled in before the
 * shop can issue an invoice, and on a fresh install it is empty.
 */
export default function SettingsPage() {
	redirect("/admin/dashboard/settings/company")
}
