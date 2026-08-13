/**
 * Leave one root layout for the other, the only way that works.
 *
 * This app has two document shells, not one: `[locale]/layout.tsx` renders the
 * storefront's `<html>` and `admin/layout.tsx` renders the dashboard's, with a
 * passthrough at the top. That is deliberate — the dashboard has no locale
 * segment and should not be dragged through locale routing — but it means the
 * two trees have no common ancestor below the document itself.
 *
 * The client router does not know that. Ask it to move between them and React
 * is told to swap one `<html>` for another directly inside `document`: it takes
 * the old shell down, the DOM no longer holds what it expects, and the page
 * dies with "Failed to execute 'removeChild' on 'Node'". A reload fixes it
 * because a reload is what should have happened in the first place.
 *
 * So these navigations are handed to the browser. It costs a full page load —
 * on signing in and signing out, where one is happening anyway.
 *
 * `replace`, not `assign`: the page being left is a login screen or a dashboard
 * the session no longer reaches, and neither is somewhere Back should return
 * to.
 */
export const hardNavigate = (path: string): void => {
	window.location.replace(path)
}

/** Whether this path lives in the dashboard's shell rather than the shop's. */
export const isAdminPath = (path: string): boolean =>
	path === "/admin" || path.startsWith("/admin/")
