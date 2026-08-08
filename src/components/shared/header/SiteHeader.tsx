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
						{NAV.map((item) => (
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
								{item.hasChildren && <ChevronDown className="size-3" />}
							</Link>
						))}
					</nav>

					<div className="ml-auto flex items-center gap-4 sm:gap-5 lg:ml-0">
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
									<Link
										href={item.href}
										onClick={closeMenu}
										aria-current={pathname === item.href ? "page" : undefined}
										className={cn(
											"hover:text-primary block py-3.5 text-sm font-medium tracking-wide uppercase transition-colors",
											pathname === item.href && "text-primary"
										)}
									>
										{NAV_LABEL[item.key][lang]}
									</Link>
								</li>
							))}
						</ul>
					</nav>
				)}
			</div>

			{/* Black categories bar, aligned under the wordmark as on the live site. */}
			<div className="border-b bg-white">
				<div className="mx-auto w-full max-w-[1400px] px-6">
					<div className="relative w-full max-w-[260px]">
						<button
							type="button"
							onClick={() => setOpenCategories((open) => !open)}
							aria-expanded={openCategories}
							className="bg-ink text-ink-foreground flex w-full items-center gap-3 px-4 py-3 text-sm font-semibold tracking-wide uppercase"
						>
							<Menu className="size-4" />
							{lang === "de" ? "Kategorien" : "Categories"}
							<ChevronDown
								className={cn("ml-auto size-4 transition-transform", openCategories && "rotate-180")}
							/>
						</button>

						{openCategories && (
							<ul className="absolute inset-x-0 top-full z-50 max-h-96 overflow-y-auto border border-t-0 bg-white shadow-lg">
								{!categories.length && (
									<li className="text-muted-foreground px-4 py-3 text-sm">
										{lang === "de" ? "Keine Kategorien" : "No categories"}
									</li>
								)}
								{categories.map((category) => (
									<li key={category.id}>
										<Link
											href={{ pathname: "/categories/[slug]", params: { slug: category.slug } }}
											className="hover:text-primary block px-4 py-2.5 text-sm hover:bg-neutral-50"
											onClick={() => setOpenCategories(false)}
										>
											{category.name}
										</Link>
									</li>
								))}
							</ul>
						)}
					</div>
				</div>
			</div>
			<CartDrawer open={openCart} onOpenChange={setOpenCart} />
		</header>
	)
}

export default SiteHeader
