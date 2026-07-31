/**
 * Cookie holding the access token.
 *
 * One readable cookie, deliberately — not localStorage as well. The proxy
 * guard has to read it server-side before a page renders, and keeping a second
 * copy in localStorage would only widen the surface a script could steal it
 * from. A stolen token here exposes B2B wholesale pricing, so the narrower the
 * better.
 *
 * The *refresh* token is a separate, httpOnly cookie (`astano_refresh`) set by
 * the API. JavaScript can never read that one.
 */
export const AUTH_COOKIE = "astano_access"

/** Access tokens live 15 minutes; the cookie is allowed to outlive one refresh. */
export const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 30
