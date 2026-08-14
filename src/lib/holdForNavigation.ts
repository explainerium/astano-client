/**
 * Start a navigation and never finish, so the form keeps saying it is busy.
 *
 * `router.push` and `window.location.replace` both return the moment they are
 * called — they begin a navigation, they do not wait for one. A submit handler
 * that ends in either resolves immediately, react-hook-form clears
 * `isSubmitting`, and the button stops spinning while the page the reader is
 * waiting for has not even started rendering. What they see is a click, a brief
 * flicker, and then a dead page — which is exactly the moment people press the
 * button a second time.
 *
 * Returning this instead leaves the promise pending, so the button stays
 * disabled and spinning until the new page replaces the old one. The component
 * is on its way out; nothing after this line was ever going to run.
 *
 * Only for a navigation that is certain to happen. Anywhere the form might
 * still be on screen afterwards, let the handler return normally.
 */
export const holdForNavigation = (start: () => void): Promise<never> => {
	start()
	return new Promise<never>(() => {})
}
