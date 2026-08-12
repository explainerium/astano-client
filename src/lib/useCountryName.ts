"use client"

import { useMemo } from "react"
import { useLocale } from "next-intl"

/**
 * Country names in the reader's language.
 *
 * Five dashboard screens each kept their own copy of this, and every one of
 * them was pinned to English — so a German admin read "Germany" on the order
 * they were looking at while the rest of the page spoke German.
 *
 * A hook rather than a plain function so the call sites keep their shape:
 * `countryName(code)` still reads the same, it just knows the language now.
 *
 * `Intl.DisplayNames` is not free to construct, so it is built once per locale
 * per component rather than on every row.
 */
export const useCountryName = () => {
	const locale = useLocale()

	return useMemo(() => {
		const names = new Intl.DisplayNames([locale], { type: "region" })

		return (code: string | null | undefined): string | null => {
			if (!code) return null

			try {
				return names.of(code) ?? code
			} catch {
				// An unknown or malformed code. Showing the code is more use than
				// showing nothing — it is at least searchable.
				return code
			}
		}
	}, [locale])
}

export default useCountryName
