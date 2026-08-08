import createMiddleware from "next-intl/middleware"
import { NextResponse, type NextRequest } from "next/server"
import { AUTH_COOKIE } from "@/constants/authKey"
import { isStaff } from "@/constants/role"
import { locales, pathnames, routing, type Locale } from "@/i18n/routing"
import { readAccessToken } from "@/utils/jwt"

const intlMiddleware = createMiddleware(routing)

type PathKey = keyof typeof pathnames

/**
 * The public URL of an internal route in one locale.
 *
 * Guards have to match what the visitor typed, and in German that is
 * /de/mein-konto, not /account. Deriving both from the same `pathnames` map
 * means a renamed slug can never leave a route silently unguarded.
 */
const pathFor = (key: PathKey, locale: Locale): string => {
	const entry = pathnames[key] as string | Record<string, string>
	const path = typeof entry === "string" ? entry : entry[locale]
	return locale === routing.defaultLocale ? path : `/${locale}${path}`
}

const allPathsFor = (key: PathKey): string[] => locales.map((l) => pathFor(key, l))

/**
 * Signed-in-only areas. Matched as prefixes, so /account/orders/123 is covered.
 *
 * Split by what the area *does*, because suspension is a commercial measure and
 * not a lockout. A suspended customer keeps their own account — their details,
 * their invoices, their address book — and loses the ability to buy. Bouncing
 * them off /account as well would leave them unable to correct the very thing
 * the suspension is often about, and mirrors nothing the API does: authAccount
 * serves them there, auth refuses them at checkout.
 */
const ACCOUNT_PATHS = allPathsFor("/account")
const TRADING_PATHS = allPathsFor("/checkout")

/** May reach their own account. */
const CAN_VIEW_ACCOUNT = ["ACTIVE", "SUSPENDED"]

/** Pages an approved, signed-in user has no reason to see. */
const AUTH_PAGES = [...allPathsFor("/login"), ...allPathsFor("/register")]

const matches = (pathname: string, prefixes: string[]): boolean =>
	prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`))

const localeOf = (pathname: string): Locale => {
	const segment = pathname.split("/")[1]
	return locales.includes(segment as Locale) ? (segment as Locale) : routing.defaultLocale
}

export async function proxy(request: NextRequest) {
	const { pathname } = request.nextUrl

	// Advisory only. The token is not verified here — there is no signing secret
	// on this side — so this decides routing, never authorisation. Every request
	// the page then makes is checked properly by the API.
	const user = readAccessToken(request.cookies.get(AUTH_COOKIE)?.value)

	// ─── Admin ──────────────────────────────────────────────────────────────
	// Deliberately outside [locale]: staff-only and single-language, so it gets
	// no locale prefix, no translated slugs and no intl middleware.
	if (pathname.startsWith("/admin")) {
		if (!user) {
			const login = new URL(pathFor("/login", routing.defaultLocale), request.url)
			login.searchParams.set("redirect", pathname)
			return NextResponse.redirect(login)
		}
		if (user.status !== "ACTIVE" || !isStaff(user.role)) {
			return NextResponse.redirect(new URL("/", request.url))
		}
		return NextResponse.next()
	}

	const locale = localeOf(pathname)

	// Anyone who has an account to go to is bounced off the sign-in pages. A
	// PENDING Reseller is not: /login is where their application status is shown,
	// and bouncing them would trap them in a redirect loop with the rule below,
	// which sends them here in the first place.
	if (matches(pathname, AUTH_PAGES) && user && CAN_VIEW_ACCOUNT.includes(user.status)) {
		return NextResponse.redirect(new URL(pathFor("/account", locale), request.url))
	}

	const wantsAccount = matches(pathname, ACCOUNT_PATHS)
	const wantsTrading = matches(pathname, TRADING_PATHS)

	if (wantsAccount || wantsTrading) {
		if (!user) {
			const login = new URL(pathFor("/login", locale), request.url)
			login.searchParams.set("redirect", pathname)
			return NextResponse.redirect(login)
		}

		/*
		 * Signed in but not permitted here. The API refuses these routes for the
		 * same statuses, so letting the page render would only produce a wall of
		 * permission errors — PENDING and REJECTED accounts go back to sign-in,
		 * where their application status is what they are shown.
		 *
		 * Checkout is stricter than the account area: only ACTIVE may commit to
		 * anything, which is what keeps a suspended customer from ordering while
		 * still letting them read what they already ordered.
		 */
		const allowed = wantsTrading ? ["ACTIVE"] : CAN_VIEW_ACCOUNT

		if (!allowed.includes(user.status)) {
			return NextResponse.redirect(new URL(pathFor("/login", locale), request.url))
		}
	}

	// Locale detection, prefix handling and the translated-pathname rewrite.
	return intlMiddleware(request)
}

export const config = {
	// Everything except API routes, Next internals and files with an extension.
	matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
}
