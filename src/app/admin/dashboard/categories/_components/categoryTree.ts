import { getPathname } from "@/i18n/navigation"
import type { AdminCategory, CategoryNode } from "@/types/catalog"

/**
 * Public URL of a category's archive page.
 *
 * Derived from the shared pathnames map rather than hardcoded, so renaming the
 * route in one place moves this link too. English, because the admin is
 * English-only — the German archive lives at /de/produkt-kategorie/…
 */
export const storefrontCategoryUrl = (slug: string): string =>
	getPathname({
		href: { pathname: "/categories/[slug]", params: { slug } },
		locale: "en",
	})

/** The translation for a locale, or undefined. */
export const translationFor = (category: AdminCategory | undefined, locale: string) =>
	category?.translations.find((t) => t.locale === locale)

/**
 * Best available name: the requested locale, then English, then whatever exists.
 * Matches the fallback the API itself uses, so the admin never shows a blank
 * row for a category that renders fine on the storefront.
 */
/*
 * Defaults to German, which is the primary language now — an English default
 * meant a German-only category fell through to "whatever exists" instead of
 * being found on the first try.
 *
 *  is a parameter rather than a constant so the two places that
 * render this as a name can pass a translated one. The sort comparators and
 * aria-labels take the default: it only appears on a category with no
 * translation in any language, which is a broken row rather than copy.
 */
export const displayName = (
	category: AdminCategory,
	locale = "de",
	untitled = "(untitled)"
): string =>
	translationFor(category, locale)?.name ??
	translationFor(category, "de")?.name ??
	translationFor(category, "en")?.name ??
	category.translations[0]?.name ??
	untitled

/**
 * Flat list → nested tree, sorted by sortOrder then name.
 *
 * Built here rather than asked of the API because the editor needs the flat
 * list anyway for the parent picker, and fetching the same data twice in two
 * shapes is how the two drift apart.
 */
export const buildTree = (categories: AdminCategory[], locale = "en"): CategoryNode[] => {
	const byId = new Map<string, CategoryNode>(
		categories.map((c) => [c.id, { ...c, children: [], depth: 0 }])
	)
	const roots: CategoryNode[] = []

	for (const node of byId.values()) {
		const parent = node.parentId ? byId.get(node.parentId) : undefined
		// A parent that is not in the list (should not happen) would otherwise
		// make the row vanish entirely, so treat it as a root.
		if (parent) parent.children.push(node)
		else roots.push(node)
	}

	const sortLevel = (nodes: CategoryNode[], depth: number): CategoryNode[] => {
		nodes.sort(
			(a, b) =>
				a.sortOrder - b.sortOrder ||
				displayName(a, locale).localeCompare(displayName(b, locale), locale)
		)
		for (const node of nodes) {
			node.depth = depth
			sortLevel(node.children, depth + 1)
		}
		return nodes
	}

	return sortLevel(roots, 0)
}

/** Depth-first flatten, so the tree can be rendered as indented table rows. */
export const flattenTree = (nodes: CategoryNode[]): CategoryNode[] =>
	nodes.flatMap((node) => [node, ...flattenTree(node.children)])

/**
 * Every id beneath `id`. Used to stop a category being reparented under one of
 * its own descendants, which would detach the whole branch from the tree.
 */
export const descendantIds = (categories: AdminCategory[], id: string): string[] => {
	const children = categories.filter((c) => c.parentId === id)
	return children.flatMap((child) => [child.id, ...descendantIds(categories, child.id)])
}
