"use client"

import { useRef, useState } from "react"
import { ChevronDown, ChevronRight } from "lucide-react"
import { Link } from "@/i18n/navigation"
import { cn } from "@/lib/utils"
import type { PublicCategory } from "@/types/storefront"

/**
 * The Products dropdown.
 *
 * The header has carried a chevron beside "Products" since it was built and
 * nothing behind it — an affordance promising a menu that was never written.
 * This is the menu: the category tree, one level of flyout for the categories
 * that have children, and nothing deeper. Two levels is what the shop actually
 * has, and a third would be a submenu opening off the edge of the viewport.
 *
 * Hover *and* focus, because a chevron in a nav bar is also a keyboard control:
 * Tab reaches it, Escape closes it, and the panel is out of the tab order while
 * hidden rather than a row of invisible stops.
 */

/**
 * The three pauses that make this feel like a menu rather than a tripwire.
 *
 * **Opening** waits, because the pointer crosses "Products" on its way to
 * "Über uns", and a menu that fires on contact flashes open and shut in
 * passing. Ninety milliseconds is under the threshold where a deliberate hover
 * starts to feel delayed, and over the time a travelling pointer spends inside
 * one nav item.
 *
 * **Closing** waits, because the gap between the trigger and the panel is not
 * the trigger — without the delay the menu shuts on the way *into* it and
 * cannot be reached at all.
 *
 * **The flyout** waits least. It only has to survive the pointer moving down
 * the list past two other categories that also have children; any longer and
 * the submenu lags visibly behind the row that is already highlighted.
 */
const OPEN_DELAY_MS = 90
const CLOSE_DELAY_MS = 140
const FLYOUT_DELAY_MS = 60

/**
 * Every row animates its own hover.
 *
 * This is what was missing. The panel faded in politely and then each row
 * snapped between white and grey underneath the pointer — which reads as a
 * different, cheaper component bolted onto the first. Two hundred milliseconds
 * on colour and background is slow enough to register as movement and fast
 * enough that the row still feels answerable to the pointer that caused it.
 */
const rowClass =
	"flex items-center gap-2 px-4 py-2 text-sm text-neutral-700 " +
	"transition-colors duration-200 ease-out hover:bg-neutral-50 hover:text-primary " +
	"motion-reduce:transition-none"

const panelBase =
	"absolute z-50 min-w-56 border bg-white py-1.5 shadow-lg " +
	// Opacity and transform animate; visibility is what takes the panel out of
	// the tab order, and transitioning it too is what delays that removal until
	// the fade has finished. Without it the panel vanishes and the closing
	// animation is never seen.
	"transition-[opacity,transform,visibility] duration-200 ease-out motion-reduce:transition-none"

/** One timer per menu, shared by opening and closing — never both pending. */
const useDelayed = () => {
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

	const cancel = () => {
		if (timer.current) clearTimeout(timer.current)
		timer.current = null
	}

	return {
		after: (ms: number, run: () => void) => {
			cancel()
			timer.current = setTimeout(run, ms)
		},
		/** Skips the pause — for keyboard and for navigation, which are decisions. */
		now: (run: () => void) => {
			cancel()
			run()
		},
	}
}

const Row = ({
	category,
	onNavigate,
	openId,
	setOpenId,
}: {
	category: PublicCategory
	onNavigate: () => void
	openId: string | null
	setOpenId: (id: string | null) => void
}) => {
	const children = category.children ?? []
	const open = openId === category.id
	const timer = useDelayed()

	if (!children.length) {
		return (
			<li>
				<Link
					href={{ pathname: "/categories/[slug]", params: { slug: category.slug } }}
					onClick={onNavigate}
					className={rowClass}
				>
					{category.name}
				</Link>
			</li>
		)
	}

	return (
		<li
			className="relative"
			onMouseEnter={() => timer.after(FLYOUT_DELAY_MS, () => setOpenId(category.id))}
			onMouseLeave={() => timer.now(() => setOpenId(null))}
		>
			<Link
				href={{ pathname: "/categories/[slug]", params: { slug: category.slug } }}
				onClick={onNavigate}
				// The parent is a real destination as well as a heading. A category
				// with children still has its own page and its own products.
				onFocus={() => timer.now(() => setOpenId(category.id))}
				aria-haspopup="true"
				aria-expanded={open}
				className={cn(rowClass, "group")}
			>
				<span className="flex-1">{category.name}</span>
				{/* Leans toward the submenu it opens, rather than merely pointing at it. */}
				<ChevronRight
					className={cn(
						"size-3.5 shrink-0 opacity-50 transition-[opacity,transform] duration-200 ease-out",
						"group-hover:translate-x-0.5 group-hover:opacity-100 motion-reduce:transition-none",
						open && "translate-x-0.5 opacity-100"
					)}
				/>
			</Link>

			<ul
				className={cn(
					panelBase,
					"top-0 left-full -mt-1.5 max-h-[70vh] overflow-y-auto",
					open ? "visible translate-x-0 opacity-100" : "invisible -translate-x-1.5 opacity-0"
				)}
			>
				{children.map((child) => (
					<li key={child.id}>
						<Link
							href={{ pathname: "/categories/[slug]", params: { slug: child.slug } }}
							onClick={onNavigate}
							className={cn(rowClass, "whitespace-nowrap")}
						>
							{child.name}
						</Link>
					</li>
				))}
			</ul>
		</li>
	)
}

/**
 * The category tree as a panel — rows, flyouts, and the open/close animation.
 *
 * Shared by the two menus that show it: the Products dropdown in the nav row
 * and the Categories bar beneath it. They open differently — one on hover, one
 * on a click — but what they open is the same tree, and the second copy of it
 * was already flat, unanimated and a level shallower than the first. One
 * component, so they cannot drift again.
 *
 * `className` places it. Everything else is the same wherever it appears.
 */
export const CategoryTree = ({
	categories,
	open,
	onNavigate,
	emptyLabel,
	className,
}: {
	categories: PublicCategory[]
	open: boolean
	onNavigate: () => void
	emptyLabel: string
	className?: string
}) => {
	const [openId, setOpenId] = useState<string | null>(null)

	return (
		<ul
			className={cn(
				panelBase,
				className,
				open ? "visible opacity-100" : "invisible opacity-0"
			)}
		>
			{!categories.length && (
				<li className="text-muted-foreground px-4 py-2 text-sm">{emptyLabel}</li>
			)}
			{categories.map((category) => (
				<Row
					key={category.id}
					category={category}
					onNavigate={onNavigate}
					openId={open ? openId : null}
					setOpenId={setOpenId}
				/>
			))}
		</ul>
	)
}

export const ProductsMenu = ({
	label,
	href,
	categories,
	isActive,
	emptyLabel,
}: {
	label: string
	href: "/products"
	categories: PublicCategory[]
	isActive: boolean
	emptyLabel: string
}) => {
	const [open, setOpen] = useState(false)
	const timer = useDelayed()

	// Closing the panel is enough — CategoryTree drops its own open flyout when
	// the panel goes, so there is no second piece of state to keep in step.
	const shut = () => setOpen(false)

	return (
		<div
			className="relative"
			onMouseEnter={() => timer.after(OPEN_DELAY_MS, () => setOpen(true))}
			onMouseLeave={() => timer.after(CLOSE_DELAY_MS, shut)}
			// Keyboard does not wait. The opening pause exists to ignore a pointer
			// passing through, and a Tab press is never that.
			onFocus={() => timer.now(() => setOpen(true))}
			// Closes when focus leaves the whole group rather than any one link, so
			// tabbing from the trigger into the panel does not shut it.
			onBlur={(event) => {
				if (!event.currentTarget.contains(event.relatedTarget as Node | null)) timer.now(shut)
			}}
			onKeyDown={(event) => {
				if (event.key === "Escape") timer.now(shut)
			}}
		>
			<Link
				href={href}
				aria-current={isActive ? "page" : undefined}
				aria-haspopup="true"
				aria-expanded={open}
				className={cn(
					"hover:text-primary inline-flex items-center gap-1 text-[13px] font-medium tracking-wide uppercase",
					"transition-colors duration-200 ease-out motion-reduce:transition-none",
					isActive && "border-b-2 border-current pb-0.5"
				)}
			>
				{label}
				<ChevronDown
					className={cn(
						"size-3 transition-transform duration-200 ease-out motion-reduce:transition-none",
						open && "rotate-180"
					)}
				/>
			</Link>

			<CategoryTree
				categories={categories}
				open={open}
				onNavigate={() => timer.now(shut)}
				emptyLabel={emptyLabel}
				className={cn(
					// No max-height here, unlike the flyout: a submenu has to be able to
					// escape this box, and a scroll container is precisely what stops it.
					// Five top-level categories do not need one.
					//
					// A hair below the trigger rather than flush against it — the gap is
					// where the pointer travels, and CLOSE_DELAY_MS is what forgives it.
					"top-full left-1/2 mt-2 -translate-x-1/2",
					open ? "translate-y-0" : "-translate-y-1.5"
				)}
			/>
		</div>
	)
}

/**
 * The same tree, stacked, for the collapsed header.
 *
 * A flyout needs a pointer and room to the side, and a phone has neither — so
 * this is a disclosure list instead: tap a category with children to reveal
 * them beneath it. The animation is the grid-rows one the FAQ accordion and the
 * product page already use, which transitions to the content's real height
 * without anybody having to measure it.
 */
export const ProductsMenuMobile = ({
	categories,
	onNavigate,
	emptyLabel,
}: {
	categories: PublicCategory[]
	onNavigate: () => void
	emptyLabel: string
}) => {
	const [openId, setOpenId] = useState<string | null>(null)

	if (!categories.length) {
		return <p className="text-muted-foreground py-2 pl-4 text-sm">{emptyLabel}</p>
	}

	return (
		<ul className="pb-2 pl-4">
			{categories.map((category) => {
				const children = category.children ?? []
				const open = openId === category.id

				return (
					<li key={category.id}>
						<div className="flex items-center">
							<Link
								href={{ pathname: "/categories/[slug]", params: { slug: category.slug } }}
								onClick={onNavigate}
								className="hover:text-primary flex-1 py-2 text-sm transition-colors duration-200 ease-out motion-reduce:transition-none"
							>
								{category.name}
							</Link>

							{/* A separate control, so the row's own link still navigates.
							    Merging the two would make a parent category unreachable. */}
							{!!children.length && (
								<button
									type="button"
									onClick={() => setOpenId(open ? null : category.id)}
									aria-expanded={open}
									aria-label={category.name}
									className="hover:text-primary p-2 transition-colors duration-200 ease-out motion-reduce:transition-none"
								>
									<ChevronDown
										className={cn(
											"size-4 transition-transform duration-300 ease-out motion-reduce:transition-none",
											open && "rotate-180"
										)}
									/>
								</button>
							)}
						</div>

						{!!children.length && (
							<div
								className={cn(
									"grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none",
									open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
								)}
							>
								<ul className="overflow-hidden">
									{children.map((child) => (
										<li key={child.id}>
											<Link
												href={{ pathname: "/categories/[slug]", params: { slug: child.slug } }}
												onClick={onNavigate}
												className="hover:text-primary block py-2 pl-4 text-sm transition-colors duration-200 ease-out motion-reduce:transition-none"
											>
												{child.name}
											</Link>
										</li>
									))}
								</ul>
							</div>
						)}
					</li>
				)
			})}
		</ul>
	)
}

export default ProductsMenu
