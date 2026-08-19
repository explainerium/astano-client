"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { ChevronDown, FileText, Heart, Menu, ShoppingCart, User, X } from "lucide-react"
import { Link, usePathname } from "@/i18n/navigation"
import {
	useCartQuery,
	useQuoteBasketQuery,
	useShopCategoriesQuery,
} from "@/redux/api/storefrontApi"
import CartDrawer from "./CartDrawer"
import ProductsMenu, { CategoryTree, ProductsMenuMobile } from "./ProductsMenu"
import LanguageSwitcher from "./LanguageSwitcher"
import { cn } from "@/lib/utils"

/**
 * The astano wordmark, set rather than imaged.
 *
 * The live site ships it as a PNG. Type reproduces it closely enough at this
 * size, stays sharp on every display, and removes one asset from the list that
 * has to migrate off WordPress before launch.
 */
const Wordmark = () => (
	<Link href="/" className="block leading-none" aria-label="astano">
		<span className="font-heading block text-[28px] font-medium tracking-[0.02em] text-neutral-800">
			astano
		</span>
		<span className="text-muted-foreground mt-0.5 block text-[9px] tracking-[0.42em] uppercase">
			Simply Superior
		</span>
	</Link>
)

const NAV = [
	{ key: "home", href: "/" as const },
	{ key: "products", href: "/products" as const, hasChildren: true },
	{ key: "about", href: "/about" as const },
	{ key: "quality", href: "/quality" as const },
	{ key: "custom", href: "/custom" as const },
	{ key: "faqs", href: "/faqs" as const },
	{ key: "contact", href: "/contact" as const },
]

/** Labels the live header carries. */
const NAV_LABEL: Record<string, { en: string; de: string }> = {
	home: { en: "Home", de: "Home" },
	products: { en: "Products", de: "Produkte" },
	about: { en: "About us", de: "Über uns" },
	quality: { en: "Quality", de: "Qualität" },
	custom: { en: "Custom-made", de: "Sonderanfertigung" },
	faqs: { en: "FAQs", de: "FAQs" },
	contact: { en: "Contact", de: "Kontakt" },
}

const IconLink = ({
	href,
	label,
	count,
	children,
}: {
	href: "/account" | "/quote-basket" | "/account/wishlist" | "/cart"
	label: string
	count?: number
	children: React.ReactNode
}) => (
	<Link
		href={href}
		aria-label={label}
		className="hover:text-primary relative inline-flex items-center transition-colors"
	>
		{children}
		{count !== undefined && (
			<span className="bg-ink text-ink-foreground absolute -top-1.5 -right-2 flex size-4 items-center justify-center rounded-full text-[10px] leading-none">
				{count}
			</span>
		)}
	</Link>
)

export const SiteHeader = ({ locale }: { locale: string }) => {
	const t = useTranslations("home")
	const lang = locale === "de" ? "de" : "en"
	const [openCategories, setOpenCategories] = useState(false)

	/**
	 * usePathname returns the *internal* route, not the translated URL, so this
	 * compares against the same hrefs NAV declares and works in both languages.
	 */
	const pathname = usePathname()

	const { data: categories = [] } = useShopCategoriesQuery({ tree: true })

	/**
	 * Both baskets are shared with the storefront pages through the same cache
	 * tags, so adding an item anywhere updates these counters without either
	 * side knowing about the other.
	 *
	 * The badges count lines, not units — "3" next to a cart holding 500 cookie
	 * cutters would be read as three products, not three of anything.
	 */
	const { data: cart } = useCartQuery()
	const { data: quoteBasket } = useQuoteBasketQuery()

	/**
	 * The main nav is a desktop row that collapses below `lg`. Without this it
	 * simply vanished on a phone — every page except the categories dropdown and
	 * the footer became unreachable, which is most of the site.
	 */
	const [openMenu, setOpenMenu] = useState(false)

	/** The basket panel. Opened from the icon, closed by any link inside it. */
	const [openCart, setOpenCart] = useState(false)

	/** The category list inside the collapsed menu. Desktop keeps its own. */
	const [openProducts, setOpenProducts] = useState(false)

	const emptyCategories = lang === "de" ? "Keine Kategorien" : "No categories"

	// Navigating with the panel open would leave it covering the new page.
	const closeMenu = () => setOpenMenu(false)

	return (
		<header className="relative z-40">
			{/* Black promo bar — the dealer registration CTA. */}
			<Link
				href="/dealer-registration"
				className="bg-ink text-ink-foreground block px-6 py-3 text-center text-sm hover:underline"
			>
				{t("topBar")}
			</Link>

			<div className="border-b bg-white">
				<div className="mx-auto flex w-full max-w-[1400px] items-center gap-4 px-6 py-4 lg:gap-8">
					<button
						type="button"
						onClick={() => setOpenMenu((open) => !open)}
						aria-expanded={openMenu}
						aria-controls="mobile-nav"
						aria-label={lang === "de" ? "Menü" : "Menu"}
						className="hover:text-primary -ml-1 shrink-0 transition-colors lg:hidden"
					>
						{openMenu ? <X className="size-6" /> : <Menu className="size-6" />}
					</button>

					<Wordmark />

					<nav className="hidden flex-1 items-center justify-center gap-7 lg:flex">
						{NAV.map((item) =>
							item.hasChildren ? (
								<ProductsMenu
									key={item.key}
									label={NAV_LABEL[item.key][lang]}
									href={item.href as "/products"}
									categories={categories}
									isActive={pathname === item.href}
									emptyLabel={emptyCategories}
								/>
							) : (
								<Link
									key={item.key}
									href={item.href}
									aria-current={pathname === item.href ? "page" : undefined}
									className={cn(
										"hover:text-primary inline-flex items-center gap-1 text-[13px] font-medium tracking-wide uppercase transition-colors",
										pathname === item.href && "border-b-2 border-current pb-0.5"
									)}
								>
									{NAV_LABEL[item.key][lang]}
								</Link>
							)
						)}
					</nav>

					<div className="ml-auto flex items-center gap-4 sm:gap-5 lg:ml-0">
						{/* Before the account icons rather than after: language is a
						    decision about the whole page, not another account action. */}
						<LanguageSwitcher className="hidden sm:flex" />
						<span className="text-border hidden sm:inline">|</span>
						<IconLink href="/account" label="Account">
							<User className="size-5" strokeWidth={1.5} />
						</IconLink>
						<span className="text-border hidden sm:inline">|</span>
						<IconLink href="/quote-basket" label="Quote basket" count={quoteBasket?.lineCount ?? 0}>
							<FileText className="size-5" strokeWidth={1.5} />
						</IconLink>
						<IconLink href="/account/wishlist" label="Wishlist">
							<Heart className="size-5" strokeWidth={1.5} />
						</IconLink>
						{/*
						 * A button, not a link — the basket opens beside the page rather
						 * than replacing it. /cart is still a real page and the drawer's
						 * own "View cart" goes there; this is the shortcut, not the
						 * replacement.
						 */}
						<button
							type="button"
							onClick={() => setOpenCart(true)}
							aria-label={lang === "de" ? "Warenkorb" : "Cart"}
							aria-haspopup="dialog"
							className="hover:text-primary relative inline-flex items-center transition-colors"
						>
							<ShoppingCart className="size-5" strokeWidth={1.5} />
							<span className="bg-ink text-ink-foreground absolute -top-1.5 -right-2 flex size-4 items-center justify-center rounded-full text-[10px] leading-none">
								{cart?.lineCount ?? 0}
							</span>
						</button>
					</div>
				</div>

				{/* The same links as the desktop row, stacked. Rendered only when
				    open so the collapsed header carries no hidden tab stops. */}
				{openMenu && (
					<nav id="mobile-nav" className="border-t lg:hidden">
						<ul className="mx-auto w-full max-w-[1400px] divide-y px-6">
							{NAV.map((item) => (
								<li key={item.key}>
									<div className="flex items-center">
										<Link
											href={item.href}
											onClick={closeMenu}
											aria-current={pathname === item.href ? "page" : undefined}
											className={cn(
												"hover:text-primary flex-1 py-3.5 text-sm font-medium tracking-wide uppercase transition-colors",
												pathname === item.href && "text-primary"
											)}
										>
											{NAV_LABEL[item.key][lang]}
										</Link>

										{item.hasChildren && (
											<button
												type="button"
												onClick={() => setOpenProducts((open) => !open)}
												aria-expanded={openProducts}
												aria-label={NAV_LABEL[item.key][lang]}
												className="hover:text-primary p-2"
											>
												<ChevronDown
													className={cn(
														"size-4 transition-transform duration-200 motion-reduce:transition-none",
														openProducts && "rotate-180"
													)}
												/>
											</button>
										)}
									</div>

									{item.hasChildren && (
										<div
											className={cn(
												"grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none",
												openProducts ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
											)}
										>
											<div className="overflow-hidden">
												<ProductsMenuMobile
													categories={categories}
													onNavigate={closeMenu}
													emptyLabel={emptyCategories}
												/>
											</div>
										</div>
									)}
								</li>
							))}

							{/* The icon row hides the switcher below `sm`, so the collapsed
							    menu is where a phone gets to change language at all. */}
							<li className="py-3.5">
								<LanguageSwitcher />
							</li>
						</ul>
					</nav>
				)}
			</div>

			{/* Black categories bar, aligned under the wordmark as on the live site. */}
			<div className="border-b bg-white">
				<div className="mx-auto w-full max-w-[1400px] px-6">
					{/*
					 * A click-opened menu, so it also has to close on a click elsewhere.
					 *
					 * The nav dropdown above closes when the pointer leaves it, which is
					 * the whole of the interaction for a hover menu. This one stays open
					 * until told otherwise, and a panel that can only be dismissed by
					 * pressing the same button again is a panel people leave open and
					 * scroll the page behind.
					 */}
					<div
						className="relative w-full max-w-[260px]"
						onBlur={(event) => {
							if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
								setOpenCategories(false)
							}
						}}
						onKeyDown={(event) => {
							if (event.key === "Escape") setOpenCategories(false)
						}}
					>
						<button
							type="button"
							onClick={() => setOpenCategories((open) => !open)}
							aria-expanded={openCategories}
							aria-haspopup="true"
							className="bg-ink text-ink-foreground flex w-full items-center gap-3 px-4 py-3 text-sm font-semibold tracking-wide uppercase"
						>
							<Menu className="size-4" />
							{lang === "de" ? "Kategorien" : "Categories"}
							<ChevronDown
								className={cn(
									"ml-auto size-4 transition-transform duration-200 ease-out motion-reduce:transition-none",
									openCategories && "rotate-180"
								)}
							/>
						</button>

						{/* The same tree the Products menu shows — subcategories included,
						    which this one used to drop, and animated rather than simply
						    appearing. Flush under the bar it belongs to, so it reads as
						    the bar opening rather than as a panel landing on the page. */}
						<CategoryTree
							categories={categories}
							open={openCategories}
							onNavigate={() => setOpenCategories(false)}
							emptyLabel={emptyCategories}
							className={cn(
								"inset-x-0 top-full border-t-0",
								openCategories ? "translate-y-0" : "-translate-y-1.5"
							)}
						/>
					</div>
				</div>
			</div>
			<CartDrawer open={openCart} onOpenChange={setOpenCart} />
		</header>
	)
}

export default SiteHeader
