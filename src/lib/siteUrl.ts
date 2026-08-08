/**
 * The storefront's own origin, without a trailing slash.
 *
 * Every absolute link the admin builds is `SITE_URL + "/something"`, so a
 * trailing slash in the environment variable produces
 * `https://astano-shop.vercel.app//products/…`. Browsers forgive it and the
 * page still loads, which is exactly why it survives to production — nothing
 * breaks, it just looks wrong in the address bar and in anything that copies
 * the link.
 *
 * Normalised here rather than fixed in the Vercel dashboard, because the value
 * is typed by a human on four platforms (local, preview, production, the VPS
 * later) and "remember not to type a trailing slash" is not a rule that holds.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(
	/\/+$/,
	""
)

/**
 * Joins paths onto the site origin, collapsing the slashes between them.
 *
 * `siteUrl("/products/", slug)` and `siteUrl("products", slug)` give the same
 * answer, so a caller cannot get it wrong by including or omitting one.
 */
export const siteUrl = (...parts: string[]): string => {
	const path = parts
		.map((part) => part.replace(/^\/+|\/+$/g, ""))
		.filter(Boolean)
		.join("/")

	return path ? `${SITE_URL}/${path}` : SITE_URL
}
