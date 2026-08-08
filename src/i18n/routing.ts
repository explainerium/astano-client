import { defineRouting } from "next-intl/routing"

/**
 * THE LANGUAGE REGISTRY (frontend side).
 *
 * Mirrors backend/src/config/locales.ts. English is primary and is served at
 * the site root; every other locale gets a prefix (German at /de/). If that
 * decision is ever reversed, change `defaultLocale` here AND `DEFAULT_LOCALE`
 * in the backend — they must agree or the API will answer in one language
 * while the page renders in another.
 */
export const locales = ["en", "de"] as const
export type Locale = (typeof locales)[number]

/**
 * Public URLs per locale.
 *
 * Keys are our *internal* route folders under src/app/[locale]/ — route groups
 * like (withShopLayout) are not part of the path. Values are what the visitor
 * actually sees.
 *
 * German URLs deliberately reproduce the old WordPress slugs. All of the site's
 * current SEO equity is German (open item #3), so /produkt-kategorie/... and
 * /angebotsanfrage keep their rankings instead of 301-ing away from them.
 * English URLs follow the English column of spec §10.2.
 *
 * Product and category *slugs* are translated too, but those come from the
 * database per locale — this map only covers the fixed path segments.
 */
export const pathnames = {
	"/": "/",

	// ─── Shop ──────────────────────────────────────────────────────────────
	"/products": { en: "/products", de: "/produkte" },
	"/products/[slug]": { en: "/products/[slug]", de: "/produkt/[slug]" },
	"/categories/[slug]": {
		en: "/categories/[slug]",
		de: "/produkt-kategorie/[slug]",
	},
	"/contact": { en: "/contact", de: "/kontakt" },
	"/faqs": { en: "/faqs", de: "/faqs" },
	// The German slug carries no umlaut — that is the live WordPress slug and
	// changing it would drop the page's existing rankings.
	"/about": { en: "/about-us", de: "/uber-uns" },
	"/quality": { en: "/quality", de: "/qualitat" },
	"/custom": { en: "/custom-orders", de: "/sonderanfertigungen" },
	"/payment-shipping": { en: "/payment-shipping", de: "/zahlung-versand" },
	"/dealers": { en: "/dealers", de: "/haendler" },

	// ─── Legal ─────────────────────────────────────────────────────────────
	// German slugs are the live WordPress ones. The English terms page is
	// served at /terms-and-conditions rather than WordPress's
	// /geschaeftsbedingungen, which is a German slug on an English page.
	"/imprint": { en: "/imprint", de: "/impressum" },
	"/privacy": { en: "/privacy-policy", de: "/datenschutz" },
	"/terms": { en: "/terms-and-conditions", de: "/agb" },
	"/cart": { en: "/cart", de: "/warenkorb" },
	"/compare": { en: "/compare", de: "/vergleichen" },
	"/checkout": { en: "/checkout", de: "/kasse" },
	"/quote-basket": { en: "/quote-request", de: "/angebotsanfrage" },

	// ─── Auth ──────────────────────────────────────────────────────────────
	"/login": { en: "/login", de: "/anmelden" },
	"/register": { en: "/register", de: "/registrieren" },
	"/dealer-registration": {
		en: "/dealer-registration",
		de: "/haendler-registrierung",
	},

	// ─── Account ───────────────────────────────────────────────────────────
	"/account": { en: "/account", de: "/mein-konto" },
	"/account/profile": { en: "/account/profile", de: "/mein-konto/profil" },
	"/account/addresses": {
		en: "/account/addresses",
		de: "/mein-konto/adressen",
	},
	"/account/orders": { en: "/account/orders", de: "/mein-konto/bestellungen" },
	"/account/orders/[id]": {
		en: "/account/orders/[id]",
		de: "/mein-konto/bestellungen/[id]",
	},
	"/account/quotes": { en: "/account/quotes", de: "/mein-konto/anfragen" },
	"/account/quotes/[id]": {
		en: "/account/quotes/[id]",
		de: "/mein-konto/anfragen/[id]",
	},
	"/account/wishlist": {
		en: "/account/wishlist",
		de: "/mein-konto/wunschliste",
	},
} as const

export const routing = defineRouting({
	locales,
	defaultLocale: "en",
	// English has no prefix, German is served under /de. Matches the backend's
	// localePrefix() helper exactly.
	localePrefix: "as-needed",
	pathnames,
})
