"use client"

import { useSyncExternalStore } from "react"
import { useTranslations } from "next-intl"
import { PenLine } from "lucide-react"
import { AUTH_COOKIE } from "@/constants/authKey"
import { ROLE } from "@/constants/role"
import { usePathname } from "@/i18n/navigation"
import { readAccessToken } from "@/utils/jwt"

/**
 * A way from the page to the words on it.
 *
 * The dashboard can change any of the marketing copy, but only if whoever is
 * editing can find it — and "Startseite ▸ Hero ▸ Slide 1 ▸ Titel" is a path
 * somebody has to translate from what they are actually looking at. This closes
 * that gap without building an in-place editor: browse the site normally, press
 * the button, land on the fields for the page you were reading.
 *
 * Only an ADMIN ever sees it, which is the same rule the screen it links to
 * enforces. Nothing here is a control — the cookie is read, not verified, the
 * same limitation proxy.ts documents — but there is nothing to control: the
 * button is a link to a page that refuses everyone else on its own.
 */

/**
 * Internal route → the content group that holds its words.
 *
 * Internal, so this is one map rather than one per language: `usePathname` from
 * our own navigation resolves /uber-uns and /about to the same `/about`.
 *
 * Pages not listed have nothing editable behind them — a product page's words
 * are the product's, and the cart's are the shop's chrome rather than its copy.
 */
const GROUP_OF: Record<string, string> = {
	"/": "home",
	"/about": "about",
	"/custom": "custom",
	"/quality": "quality",
	"/dealers": "dealers",
	"/faqs": "faq",
	"/contact": "contact",
	"/payment-shipping": "payment",
}

/** Whether the cookie in this browser says ADMIN. Read, never verified. */
const readIsAdmin = (): boolean => {
	const raw = document.cookie
		.split("; ")
		.find((entry) => entry.startsWith(`${AUTH_COOKIE}=`))
		?.slice(AUTH_COOKIE.length + 1)

	return readAccessToken(raw ? decodeURIComponent(raw) : undefined)?.role === ROLE.ADMIN
}

/** The cookie does not change under a page that is already open. */
const subscribe = () => () => {}

/** The server has no cookie to read, so it draws nothing and the client adds it. */
const onServer = () => false

export const EditThisPage = () => {
	const t = useTranslations("admin")
	const pathname = usePathname()

	/**
	 * `useSyncExternalStore`, not an effect that sets state.
	 *
	 * The cookie is outside React and unavailable while the page renders on the
	 * server, so this has to be decided in the browser. Reading it in an effect
	 * and calling setState works but is the pattern React Compiler warns about,
	 * and it makes the first paint a render that will immediately be thrown
	 * away. This is the primitive for exactly this: a server snapshot of
	 * "nothing", a client snapshot that reads the cookie, and no hydration
	 * mismatch between them.
	 */
	const isAdmin = useSyncExternalStore(subscribe, readIsAdmin, onServer)

	const group = GROUP_OF[pathname]
	if (!isAdmin || !group) return null

	return (
		<a
			href={`/admin/dashboard/content/${group}`}
			className="bg-ink text-ink-foreground fixed right-5 bottom-5 z-50 inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium shadow-lg transition-opacity hover:opacity-90"
		>
			<PenLine className="size-4" />
			{t("editThisPage")}
		</a>
	)
}

export default EditThisPage
