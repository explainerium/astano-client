import { createNavigation } from "next-intl/navigation"
import { routing } from "./routing"

/**
 * Locale-aware navigation primitives.
 *
 * Always import Link / useRouter / redirect from here, never from "next/link"
 * or "next/navigation" — these resolve the translated pathname for the active
 * locale, so <Link href="/cart"> renders /cart in English and /warenkorb in
 * German without any call site knowing about it.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } =
	createNavigation(routing)
