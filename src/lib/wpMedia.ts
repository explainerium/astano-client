/**
 * Image URLs still pointing at the WordPress uploads folder.
 *
 * These are the real photographs from the live site and they resolve only
 * while the Local install is running on this machine. Every one of them has to
 * move into the media library (and R2) before this page can be deployed — going
 * through a single helper means that is one constant to change, not a grep
 * across every section component.
 */
const WP_BASE = process.env.NEXT_PUBLIC_WP_MEDIA_URL ?? "http://astano-v2.local"

export const wp = (path: string) => `${WP_BASE}${path}`

/** Hero slides — `woodmart_slide` posts 90 / 128 / 143 on the live site. */
export const HERO_IMAGES = [
	wp("/wp-content/uploads/2025/12/1ffe7fc15fdfcc30f57bae6091b3558ec43e58c0_Trinkhalm-Teaser_1.jpg"),
	wp(
		"/wp-content/uploads/2025/12/a08a185be241a42b508fc68abacacc9dcddd033f_Cookie-cutter-Ausstechformen-Teaser-1.jpg"
	),
	wp(
		"/wp-content/uploads/2025/12/ad1421aa65a7235d306b4e9fed56a8760b2e3025_Eiswuerfel-Edelstahl_Mood_neue-Varianten_small.jpg"
	),
]

/** The four banner tiles under the hero. */
export const TILE_IMAGES = [
	wp("/wp-content/uploads/2026/03/Edelstahl-Bearbeitung-Laser.jpg"),
	wp("/wp-content/uploads/2026/03/Qualitaet-Materialien-astano.jpg"),
	wp("/wp-content/uploads/2026/03/Verpackungen-astano.jpg"),
	wp("/wp-content/uploads/2025/12/3d-rendewring-cryptocurency-distribution-concept-1-scaled.jpg"),
]

/** Line icons on the "Sonderanfertigungen" cards. */
export const CUSTOM_ICONS = [
	wp("/wp-content/uploads/2025/12/zoom_561178.png"),
	wp("/wp-content/uploads/2025/12/diamond_765042.png"),
	wp("/wp-content/uploads/2025/12/maintenance.png"),
	wp("/wp-content/uploads/2025/12/check_471694.png"),
]

/** The three photographs on Über uns — straws, ice cubes, cookie cutters. */
export const ABOUT_IMAGES = [
	wp("/wp-content/uploads/2025/12/reusable-metal-silver-straws-top-view-scaled.jpg"),
	wp(
		"/wp-content/uploads/2025/12/stainless-steel-cubes-simulating-ice-cooling-drinks-black-surface-with-reflection_44272-3799.jpg"
	),
	wp("/wp-content/uploads/2025/12/christmas-cookies-preparation-scaled.jpg"),
]

/**
 * Icons on the four Über uns value cards.
 *
 * The live site pairs the first two differently in each language — German gives
 * "Gebaut für langfristige Qualität" the trophy, English gives its own
 * translation of that card the wrench. One of the two is an editing slip; this
 * uses the German pairing for both, since the cards are translations of each
 * other and should not change icon when the visitor changes language.
 */
/** The four tiles on Händler — wholesale, EU VAT, custom production, approval. */
export const DEALER_IMAGES = [
	wp("/wp-content/uploads/2025/12/cardboard-boxes-conveyor-belt-warehouse-scaled.jpg"),
	wp("/wp-content/uploads/2025/12/euroskulptur-frankfurt-downtown-germany-scaled.jpg"),
	wp("/wp-content/uploads/2025/12/high-angle-woman-working-as-clothing-designer-scaled.jpg"),
	wp("/wp-content/uploads/2025/12/warehouse-worker-scanning-barcode-package-scaled.jpg"),
]

/**
 * The two photographs on Sonderanfertigung.
 *
 * Taken from the German page. The English one shows a stock ice-cube photo and
 * a Shopify screenshot left over from the theme demo — these are the real
 * astano product shots, so both languages use them.
 */
export const CUSTOM_IMAGES = [
	wp("/wp-content/uploads/2026/03/Individuelle-Trinkhalme.jpg"),
	wp("/wp-content/uploads/2026/03/Kreative-individuelle-Ausstechformen.jpg"),
]

/** Icons on the four "Warum es funktioniert" cards. */
export const CUSTOM_WHY_ICONS = [
	wp("/wp-content/uploads/2025/12/tabler-tools-1.png"),
	wp("/wp-content/uploads/2025/12/material-symbols-shield-outline.png"),
	wp("/wp-content/uploads/2025/12/material-symbols-light-bolt-outline.png"),
	wp("/wp-content/uploads/2025/12/fluent-emoji-high-contrast-bullseye.png"),
]

/** The two photographs on Qualität — the QA bench, and cubes in a glass. */
export const QUALITY_IMAGES = [
	wp("/wp-content/uploads/2026/03/Qualitaetskontrolle-astano-Edelstahl-Eiswuerfel.jpg"),
	wp("/wp-content/uploads/2025/12/steel-cooling-cubes-cocktail-drink-glass-background_220507-20821.jpg"),
]

/** Icons on the three "Was Qualität für uns bedeutet" cards. */
export const QUALITY_ICONS = [
	wp("/wp-content/uploads/2025/12/diamond_765042.png"),
	wp("/wp-content/uploads/2025/12/target_3721149.png"),
	wp("/wp-content/uploads/2025/12/check_471694.png"),
]

export const ABOUT_ICONS = [
	wp("/wp-content/uploads/2025/12/trophy.png"),
	wp("/wp-content/uploads/2025/12/maintenance.png"),
	wp("/wp-content/uploads/2025/12/settings.png"),
	wp("/wp-content/uploads/2025/12/idea.png"),
]
