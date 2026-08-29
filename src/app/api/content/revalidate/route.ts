import { revalidateTag } from "next/cache"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { AUTH_COOKIE } from "@/constants/authKey"
import { ROLE } from "@/constants/role"
import { CONTENT_TAG } from "@/lib/contentOverrides"
import { readAccessToken } from "@/utils/jwt"

/**
 * Drop the cached page content, so an edit is visible on the next request.
 *
 * The dashboard calls this after a save. It has to be here rather than in the
 * API, because the cache being cleared is Next's own — the API has no way to
 * reach it, and a tag is the only thing that clears it across every running
 * instance rather than the one that happened to serve the save.
 *
 * Without it an edit would take up to the revalidate window to appear, which is
 * a poor way to treat somebody who has just pressed Save and is looking at the
 * page to see whether it worked.
 *
 * ── What the check below is, and is not ─────────────────────────────────────
 *
 * `/api/*` is outside the proxy's matcher, so nothing has guarded this request
 * before it arrives. The token is read but **not verified** — there is no
 * signing secret on this side, the same limitation proxy.ts documents. So this
 * establishes that the caller holds something shaped like an admin session, not
 * that they are an admin.
 *
 * That is deliberately proportionate. Clearing a cache destroys nothing and
 * reveals nothing; the worst a forged cookie achieves is making the storefront
 * re-fetch its own public content. The check is here to keep the endpoint from
 * being a free way to make the shop do work, not to protect a secret. Anything
 * that *changes* content goes through the API, which verifies properly and
 * refuses everyone but an ADMIN.
 */
export async function POST() {
	const store = await cookies()
	const user = readAccessToken(store.get(AUTH_COOKIE)?.value)

	if (!user || user.role !== ROLE.ADMIN) {
		return NextResponse.json({ revalidated: false }, { status: 403 })
	}

	// `{ expire: 0 }` rather than a named profile: the point of this call is that
	// the edit is visible on the very next request, so there is no window of
	// staleness to describe. Next 16 made the second argument required.
	revalidateTag(CONTENT_TAG, { expire: 0 })

	return NextResponse.json({ revalidated: true, tag: CONTENT_TAG })
}
