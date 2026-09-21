"use client"

import { useSyncExternalStore } from "react"

/**
 * The category the visitor was last browsing, for the product page's way back.
 *
 * A product can sit in several categories — the sandwich cutter is in two — so
 * "the category before" is not a property of the product; it is where this
 * visitor came from. The archive writes its slug here and the product page
 * reads it, preferring it over the product's first category when the product
 * is actually in it.
 *
 * sessionStorage rather than the URL: a ?from= on every product link would
 * give each product page as many addresses as it has categories, and the tab's
 * own session is exactly as long as "the one before" means anything. Every
 * access is guarded — storage can be missing or throw in a private window, and
 * the page must work without it.
 */
const KEY = "astano:lastCategory"
const listeners = new Set<() => void>()

export const rememberCategory = (slug: string | null): void => {
	try {
		if (slug) sessionStorage.setItem(KEY, slug)
		else sessionStorage.removeItem(KEY)
	} catch {
		// Nothing to do: the breadcrumb falls back to the product's own category.
	}
	listeners.forEach((listener) => listener())
}

const read = (): string | null => {
	try {
		return sessionStorage.getItem(KEY)
	} catch {
		return null
	}
}

const subscribe = (listener: () => void) => {
	listeners.add(listener)
	return () => {
		listeners.delete(listener)
	}
}

/** Null on the server and on the first client render, so hydration matches. */
export const useLastCategory = (): string | null =>
	useSyncExternalStore(subscribe, read, () => null)
