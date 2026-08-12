"use server"

import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { ADMIN_LOCALE_COOKIE, isAdminLocale } from "@/lib/adminLocale"

/**
 * Stores the staff member's dashboard language.
 *
 * A server action rather than a client-side cookie write, because the messages
 * are resolved in the layout on the server: setting it in the browser would
 * leave the already-rendered tree in the old language until something happened
 * to refresh it.
 *
 * A year, and not httpOnly — nothing here is a credential, and a preference
 * that expires with the session is a preference that has to be set again every
 * morning.
 */
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365

export const setAdminLocale = async (locale: string) => {
	// Never trust the argument. It reaches the cookie, and from there `lang` on
	// the document and a catalogue lookup.
	if (!isAdminLocale(locale)) return

	const store = await cookies()

	store.set(ADMIN_LOCALE_COOKIE, locale, {
		path: "/admin",
		maxAge: ONE_YEAR_SECONDS,
		sameSite: "lax",
	})

	// The layout reads the cookie, so the whole dashboard has to be rebuilt —
	// refreshing only the current page would leave the sidebar in the old
	// language beside a translated one.
	revalidatePath("/admin", "layout")
}
