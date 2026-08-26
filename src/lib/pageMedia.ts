/**
 * Photographs and icons on the marketing pages, in our own media library.
 *
 * These used to be loaded straight from `www.astano.de/wp-content/uploads/…`,
 * which meant the new shop could not outlive the old one: switching WordPress
 * off would have emptied the home page, Über uns, Händler, Sonderanfertigung
 * and Qualität all at once. They have been imported (see
 * `backend/scripts/import-wp-media.ts`) and are served from the shop's own
 * storage now — there is no longer any request to astano.de anywhere in the
 * storefront.
 *
 * The WordPress path each one came from is kept as the key. It is the only
 * record of provenance once the old site is gone, and it is what makes a
 * re-import line up with what is already here.
 *
 * Storage keys rather than whole URLs, so the bucket can move without editing
 * thirty strings.
 */
/**
 * Where these particular files live. Not an environment setting, on purpose.
 *
 * Product images never need this: the API resolves them and hands the
 * storefront a finished URL, so the frontend has no reason to know the storage
 * origin. Building these from `NEXT_PUBLIC_MEDIA_URL` looked consistent and was
 * wrong twice over — the deployment does not set it, so all thirty resolved
 * against the shop's own domain and every marketing image broke; and local
 * development *does* set it, to the API, which has never held these files
 * either. The one variable available was wrong in both places.
 *
 * These are pinned to specific objects in the shop's public bucket, the same
 * way their keys are. If the bucket moves, this line and
 * `backend/scripts/wp-media-map.json` move together.
 */
const BASE = "https://dgxmkgxaydmeivbwoysg.supabase.co/storage/v1/object/public/astano-media"

/** WordPress upload path → our storage key. */
const IMPORTED: Record<string, string> = {
	"2025/12/1ffe7fc15fdfcc30f57bae6091b3558ec43e58c0_Trinkhalm-Teaser_1.jpg":
		"2026/08/a00c70b639ad7febe7788a9f5c6d1d2b.webp",
	"2025/12/3d-rendewring-cryptocurency-distribution-concept-1-scaled.jpg":
		"2026/08/7071e024b3db8286c2ca636ace22e25e.webp",
	"2025/12/a08a185be241a42b508fc68abacacc9dcddd033f_Cookie-cutter-Ausstechformen-Teaser-1.jpg":
		"2026/08/d6c15f12077b8057af19ebfe92a94bc5.webp",
	"2025/12/ad1421aa65a7235d306b4e9fed56a8760b2e3025_Eiswuerfel-Edelstahl_Mood_neue-Varianten_small.jpg":
		"2026/08/2fda4441a9015e493f175f049699c74b.webp",
	"2025/12/cardboard-boxes-conveyor-belt-warehouse-scaled.jpg":
		"2026/08/4023507731be631c0a66aee2d37f82b2.webp",
	"2025/12/check_471694.png": "2026/08/20dac5dc13e12cf7455671c773bebfde.webp",
	"2025/12/christmas-cookies-preparation-scaled.jpg":
		"2026/08/70976941d9f736ae910eebba891bf8fc.webp",
	"2025/12/diamond_765042.png": "2026/08/85a6385b0c37693efaf74756d6b19917.webp",
	"2025/12/euroskulptur-frankfurt-downtown-germany-scaled.jpg":
		"2026/08/a0a32c70b47093e778b7a6bfc12e1a50.webp",
	"2025/12/fluent-emoji-high-contrast-bullseye.png":
		"2026/08/83d5f68442f1c1873a7d2fe03ddf4a9f.webp",
	"2025/12/high-angle-woman-working-as-clothing-designer-scaled.jpg":
		"2026/08/1438c50f50a049d5892f40196a394b8e.webp",
	"2025/12/idea.png": "2026/08/ecede0c78afd2906e399c9944578d614.webp",
	"2025/12/maintenance.png": "2026/08/99ac80fea5d57168b023da0fe7c4d8d2.webp",
	"2025/12/material-symbols-light-bolt-outline.png":
		"2026/08/54161696b5cfc4c7c874f740f3d68fd4.webp",
	"2025/12/material-symbols-shield-outline.png": "2026/08/7bb2a9b165e11e85aaa7eada02e0be6d.webp",
	"2025/12/reusable-metal-silver-straws-top-view-scaled.jpg":
		"2026/08/f13c1f8a3e61b6ec74e75336348e97c1.webp",
	"2025/12/settings.png": "2026/08/c871464cf8c2371e98cb5a652762cbf8.webp",
	"2025/12/stainless-steel-cubes-simulating-ice-cooling-drinks-black-surface-with-reflection_44272-3799.jpg":
		"2026/08/4790447c8a07ca6d26277a041b5ff754.webp",
	"2025/12/steel-cooling-cubes-cocktail-drink-glass-background_220507-20821.jpg":
		"2026/08/8eb62c5a01088bf69b786c23d08cb563.webp",
	"2025/12/tabler-tools-1.png": "2026/08/059cb550ba41716e02f82d5778f22c9d.webp",
	"2025/12/target_3721149.png": "2026/08/55ec2e2bb9f650aa5c21419f5a7e66d7.webp",
	"2025/12/trophy.png": "2026/08/7f3fbd7c9ad0d2d5644db2b73c8f15f5.webp",
	"2025/12/warehouse-worker-scanning-barcode-package-scaled.jpg":
		"2026/08/c88b9399293736aae249c938469428fc.webp",
	"2025/12/zoom_561178.png": "2026/08/8a39b77ebba3bc42670b340eb22c5143.webp",
	"2026/03/Edelstahl-Bearbeitung-Laser.jpg": "2026/08/d4b5d558c3534ecee4578b0e5092ab9b.webp",
	"2026/03/Individuelle-Trinkhalme.jpg": "2026/08/8db67061aca188113dfc73390c271bf5.webp",
	/*
	 * Shares its file with a product image rather than having its own copy.
	 *
	 * The import brought this picture in a second time — the Sonderanfertigung
	 * page and a product were both using it, so the library held it twice at the
	 * same size. One file, two callers.
	 */
	"2026/03/Kreative-individuelle-Ausstechformen.jpg":
		"2026/08/984c97fbe22df7fb6fc34855affffdb1.webp",
	"2026/03/Qualitaet-Materialien-astano.jpg": "2026/08/d82f5a16864ffe5285ef38af31a874f5.webp",
	"2026/03/Qualitaetskontrolle-astano-Edelstahl-Eiswuerfel.jpg":
		"2026/08/dbe208fcf15cb62a4f0fdfceed9e8095.webp",
	"2026/03/Verpackungen-astano.jpg": "2026/08/370e0736b6d458a7a8d6069056d2ca52.webp",
}

/**
 * One page image, by the WordPress path it was imported from.
 *
 * An unknown key returns an empty string rather than a broken link to the old
 * site — a missing image is a visible gap somebody fixes, a link to a domain
 * that may not exist is a gap that only appears after the switch-off.
 */
const image = (wpPath: string): string => {
	const key = IMPORTED[wpPath.replace("/wp-content/uploads/", "")]
	return key ? `${BASE}/${key}` : ""
}

/** Hero slides — straws, cookie cutters, ice cubes. */
export const HERO_IMAGES = [
	image("2025/12/1ffe7fc15fdfcc30f57bae6091b3558ec43e58c0_Trinkhalm-Teaser_1.jpg"),
	image("2025/12/a08a185be241a42b508fc68abacacc9dcddd033f_Cookie-cutter-Ausstechformen-Teaser-1.jpg"),
	image("2025/12/ad1421aa65a7235d306b4e9fed56a8760b2e3025_Eiswuerfel-Edelstahl_Mood_neue-Varianten_small.jpg"),
]

/** The four banner tiles under the hero. */
export const TILE_IMAGES = [
	image("2026/03/Edelstahl-Bearbeitung-Laser.jpg"),
	image("2026/03/Qualitaet-Materialien-astano.jpg"),
	image("2026/03/Verpackungen-astano.jpg"),
	image("2025/12/3d-rendewring-cryptocurency-distribution-concept-1-scaled.jpg"),
]

/** Line icons on the "Sonderanfertigungen" cards. */
export const CUSTOM_ICONS = [
	image("2025/12/zoom_561178.png"),
	image("2025/12/diamond_765042.png"),
	image("2025/12/maintenance.png"),
	image("2025/12/check_471694.png"),
]

/** The three photographs on Über uns — straws, ice cubes, cookie cutters. */
export const ABOUT_IMAGES = [
	image("2025/12/reusable-metal-silver-straws-top-view-scaled.jpg"),
	image(
		"2025/12/stainless-steel-cubes-simulating-ice-cooling-drinks-black-surface-with-reflection_44272-3799.jpg"
	),
	image("2025/12/christmas-cookies-preparation-scaled.jpg"),
]

/** The four tiles on Händler — wholesale, EU VAT, custom production, approval. */
export const DEALER_IMAGES = [
	image("2025/12/cardboard-boxes-conveyor-belt-warehouse-scaled.jpg"),
	image("2025/12/euroskulptur-frankfurt-downtown-germany-scaled.jpg"),
	image("2025/12/high-angle-woman-working-as-clothing-designer-scaled.jpg"),
	image("2025/12/warehouse-worker-scanning-barcode-package-scaled.jpg"),
]

/**
 * The two photographs on Sonderanfertigung.
 *
 * Taken from the German page. The English one showed a stock ice-cube photo and
 * a Shopify screenshot left over from the theme demo — these are the real
 * astano product shots, so both languages use them.
 */
export const CUSTOM_IMAGES = [
	image("2026/03/Individuelle-Trinkhalme.jpg"),
	image("2026/03/Kreative-individuelle-Ausstechformen.jpg"),
]

/** Icons on the four "Warum es funktioniert" cards. */
export const CUSTOM_WHY_ICONS = [
	image("2025/12/tabler-tools-1.png"),
	image("2025/12/material-symbols-shield-outline.png"),
	image("2025/12/material-symbols-light-bolt-outline.png"),
	image("2025/12/fluent-emoji-high-contrast-bullseye.png"),
]

/** The two photographs on Qualität — the QA bench, and cubes in a glass. */
export const QUALITY_IMAGES = [
	image("2026/03/Qualitaetskontrolle-astano-Edelstahl-Eiswuerfel.jpg"),
	image("2025/12/steel-cooling-cubes-cocktail-drink-glass-background_220507-20821.jpg"),
]

/** Icons on the three "Was Qualität für uns bedeutet" cards. */
export const QUALITY_ICONS = [
	image("2025/12/diamond_765042.png"),
	image("2025/12/target_3721149.png"),
	image("2025/12/check_471694.png"),
]

/**
 * Icons on the four Über uns value cards.
 *
 * The live site paired the first two differently in each language — German gave
 * "Gebaut für langfristige Qualität" the trophy, English gave its own
 * translation of that card the wrench. One of the two was an editing slip; this
 * uses the German pairing for both, since the cards are translations of each
 * other and should not change icon when the visitor changes language.
 */
export const ABOUT_ICONS = [
	image("2025/12/trophy.png"),
	image("2025/12/maintenance.png"),
	image("2025/12/settings.png"),
	image("2025/12/idea.png"),
]
