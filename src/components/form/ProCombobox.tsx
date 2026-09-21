"use client"

import { useEffect, useId, useMemo, useRef, useState } from "react"
import { Controller, useFormContext } from "react-hook-form"
import { CheckIcon, ChevronsUpDownIcon, SearchIcon } from "lucide-react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import FieldShell from "./FieldShell"

export interface ProComboboxOption {
	label: string
	value: string
	/** Extra terms that should match this option but are not shown. */
	keywords?: string[]
	disabled?: boolean
	/** A short muted note at the end of the row — an article number, say. */
	hint?: string
	/** Which of the `groups` this option belongs to. */
	groups?: string[]
}

export interface ProComboboxGroup {
	value: string
	label: string
}

export interface ProComboboxProps {
	name: string
	options: ProComboboxOption[]
	label?: string
	placeholder?: string
	searchPlaceholder?: string
	description?: string
	required?: boolean
	disabled?: boolean
	/**
	 * Select several. The field value becomes a string[], the popover stays open
	 * between picks, and the trigger summarises the selection.
	 */
	multiple?: boolean
	className?: string
	/**
	 * Chips under the search box that narrow the list to one group, with an
	 * "all" chip first. A long list of similar names — "… für Ausstechformen"
	 * forty times — is found by what it belongs to before it is found by name.
	 */
	groups?: ProComboboxGroup[]
	/** The chip that is on when the list opens. Absent means "all". */
	defaultGroup?: string
	/** Label of the "all" chip. */
	allGroupsLabel?: string
	/** Extra classes for the popover — a wider list than the trigger, say. */
	contentClassName?: string
	/** Extra classes for the list — a taller one, say. */
	listClassName?: string
}

/**
 * Fold away accents and case so a search matches what people actually type.
 *
 * "osterreich" has to find "Österreich" — a German customer typing their own
 * country on a keyboard set to something else is not an edge case here. NFD
 * splits "Ö" into "O" plus a combining diaeresis, which the range below strips.
 */
const fold = (value: string): string =>
	value
		.normalize("NFD")
		// \p{Diacritic} rather than a literal U+0300–U+036F range: combining
		// marks are invisible in source and get mangled by editors and diffs.
		.replace(/\p{Diacritic}/gu, "")
		.toLowerCase()

/**
 * Searchable single-select, built on Radix Popover.
 *
 * Written by hand rather than pulling in a combobox library, so the ARIA is
 * spelled out here: the search input is the combobox, the list below is its
 * listbox, and `aria-activedescendant` moves the screen-reader cursor without
 * ever taking DOM focus off the input. That last part is what makes arrow keys
 * and typing work at the same time.
 */
export const ProCombobox = ({
	name,
	options,
	label,
	placeholder,
	searchPlaceholder,
	description,
	required,
	disabled,
	multiple = false,
	className,
	groups,
	defaultGroup,
	allGroupsLabel,
	contentClassName,
	listClassName,
}: ProComboboxProps) => {
	const { control } = useFormContext()
	const t = useTranslations("common")

	const [open, setOpen] = useState(false)
	const [query, setQuery] = useState("")
	const [highlighted, setActiveIndex] = useState(0)
	const [group, setGroup] = useState<string | null>(null)

	const listId = useId()
	const optionId = (index: number) => `${listId}-option-${index}`

	const inputRef = useRef<HTMLInputElement>(null)
	const listRef = useRef<HTMLUListElement>(null)

	const filtered = useMemo(() => {
		const inGroup = group
			? options.filter((option) => option.groups?.includes(group))
			: options
		if (!query.trim()) return inGroup
		const needle = fold(query.trim())
		return inGroup.filter((option) =>
			[option.label, option.value, ...(option.keywords ?? [])].some((term) =>
				fold(term).includes(needle)
			)
		)
	}, [options, query, group])

	/*
	 * Clamped on read, not stored clamped.
	 *
	 * The list shrinks as the query narrows, so a stored index can end up past
	 * the end. Correcting it in an effect meant a second render every time the
	 * filter changed, and setting state from an effect is what the compiler
	 * warns about — the clamp is a function of what is on screen, so it belongs
	 * in the render that draws it.
	 */
	const activeIndex = Math.min(highlighted, Math.max(filtered.length - 1, 0))

	useEffect(() => {
		if (!open) return
		listRef.current
			?.querySelector(`[data-index="${activeIndex}"]`)
			?.scrollIntoView({ block: "nearest" })
	}, [activeIndex, open])

	return (
		<Controller
			control={control}
			name={name}
			render={({ field, fieldState: { error } }) => {
				const values: string[] = multiple
					? Array.isArray(field.value)
						? field.value
						: []
					: []
				const selected = multiple
					? undefined
					: options.find((option) => option.value === field.value)

				const isChosen = (option: ProComboboxOption) =>
					multiple ? values.includes(option.value) : option.value === field.value

				const choose = (option: ProComboboxOption) => {
					if (option.disabled) return

					if (multiple) {
						// Stay open — picking several categories one at a time through
						// a popover that closes on every click is punishing.
						field.onChange(
							values.includes(option.value)
								? values.filter((v) => v !== option.value)
								: [...values, option.value]
						)
						return
					}

					field.onChange(option.value)
					setOpen(false)
					setQuery("")
				}

				const triggerLabel = multiple
					? values.length === 0
						? (placeholder ?? t("select"))
						: values.length <= 2
							? options
									.filter((o) => values.includes(o.value))
									.map((o) => o.label)
									.join(", ")
							: t("selectedCount", { count: values.length })
					: (selected?.label ?? placeholder ?? t("select"))

				const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
					if (event.key === "ArrowDown" || event.key === "ArrowUp") {
						event.preventDefault()
						if (!filtered.length) return
						const step = event.key === "ArrowDown" ? 1 : -1
						setActiveIndex((current) => (current + step + filtered.length) % filtered.length)
						return
					}
					if (event.key === "Home") {
						event.preventDefault()
						setActiveIndex(0)
						return
					}
					if (event.key === "End") {
						event.preventDefault()
						setActiveIndex(Math.max(filtered.length - 1, 0))
						return
					}
					if (event.key === "Enter") {
						event.preventDefault()
						const option = filtered[activeIndex]
						if (option) choose(option)
					}
				}

				return (
					<FieldShell
						name={name}
						label={label}
						description={description}
						error={error?.message}
						required={required}
						className={className}
					>
						<Popover
							open={open}
							onOpenChange={(next) => {
								setOpen(next)
								if (!next) setQuery("")
								else {
									// Every opening starts from the chip the caller chose,
									// not from wherever the last visit left it.
									setGroup(defaultGroup ?? null)
									// Open on the current choice rather than the top.
									const index = filtered.findIndex((o) => isChosen(o))
									setActiveIndex(index >= 0 ? index : 0)
								}
							}}
						>
							<PopoverTrigger asChild>
								<Button
									id={name}
									type="button"
									variant="outline"
									size="lg"
									disabled={disabled}
									aria-haspopup="listbox"
									aria-expanded={open}
									aria-invalid={!!error}
									onBlur={field.onBlur}
									className={cn(
										"w-full justify-between font-normal",
										// Muted only while nothing is chosen — in multi mode
										// `selected` is always undefined, so testing it alone
										// would grey out a filled field.
										(multiple ? values.length === 0 : !selected) &&
											"text-muted-foreground"
									)}
								>
									{/* Truncated, with the whole name on hover: a long
									    choice in a narrow trigger otherwise pushes the
									    chevron out of the box. */}
									<span className="min-w-0 truncate" title={triggerLabel}>
										{triggerLabel}
									</span>
									<ChevronsUpDownIcon className="opacity-50" />
								</Button>
							</PopoverTrigger>

							<PopoverContent
								align="start"
								className={cn("w-(--radix-popover-trigger-width) p-0", contentClassName)}
								onOpenAutoFocus={(event) => {
									// Focus the search box, not the first option.
									event.preventDefault()
									inputRef.current?.focus()
								}}
							>
								<div className="flex items-center gap-2 border-b px-3">
									<SearchIcon className="text-muted-foreground size-4 shrink-0" />
									<input
										ref={inputRef}
										role="combobox"
										aria-expanded
										aria-controls={listId}
										aria-autocomplete="list"
										aria-activedescendant={
											filtered.length ? optionId(activeIndex) : undefined
										}
										value={query}
										onChange={(event) => {
											setQuery(event.target.value)
											setActiveIndex(0)
										}}
										onKeyDown={onKeyDown}
										placeholder={searchPlaceholder ?? t("search")}
										className="placeholder:text-muted-foreground h-10 w-full bg-transparent text-sm outline-none"
									/>
								</div>

								{!!groups?.length && (
									<div className="flex flex-wrap gap-1.5 border-b p-2">
										{[{ value: null, label: allGroupsLabel ?? t("all") }, ...groups].map(
											(chip) => {
												const on = group === chip.value
												return (
													<button
														key={chip.value ?? "all"}
														type="button"
														aria-pressed={on}
														// Mouse down, so focus stays in the search box and
														// the arrow keys keep working after a chip.
														onMouseDown={(event) => {
															event.preventDefault()
															setGroup(chip.value)
															setActiveIndex(0)
														}}
														className={cn(
															"rounded-full border px-2.5 py-1 text-xs transition-colors",
															on
																? "border-primary bg-primary text-primary-foreground"
																: "text-muted-foreground hover:bg-muted"
														)}
													>
														{chip.label}
													</button>
												)
											}
										)}
									</div>
								)}

								<ul
									ref={listRef}
									id={listId}
									role="listbox"
									aria-label={label}
									aria-multiselectable={multiple || undefined}
									className={cn("max-h-64 overflow-y-auto p-1", listClassName)}
								>
									{filtered.map((option, index) => {
										const isActive = index === activeIndex
										const isSelected = isChosen(option)

										return (
											<li
												key={option.value}
												id={optionId(index)}
												data-index={index}
												role="option"
												aria-selected={isSelected}
												aria-disabled={option.disabled}
												// Mouse down rather than click: click fires after
												// blur, which would close the popover first.
												onMouseDown={(event) => {
													event.preventDefault()
													choose(option)
												}}
												onMouseEnter={() => setActiveIndex(index)}
												className={cn(
													"flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm",
													isActive && "bg-muted",
													option.disabled && "pointer-events-none opacity-50"
												)}
											>
												<CheckIcon
													className={cn(
														"size-4 shrink-0",
														isSelected ? "opacity-100" : "opacity-0"
													)}
												/>
												<span className="min-w-0 flex-1">{option.label}</span>
												{option.hint && (
													<span className="text-muted-foreground shrink-0 text-xs tabular-nums">
														{option.hint}
													</span>
												)}
											</li>
										)
									})}

									{!filtered.length && (
										<li className="text-muted-foreground px-2 py-6 text-center text-sm">
											{t("noResults")}
										</li>
									)}
								</ul>

								{/* Announced to screen readers as the list narrows; silent to
								    everyone else. */}
								<p aria-live="polite" className="sr-only">
									{t("resultCount", { count: filtered.length })}
								</p>
							</PopoverContent>
						</Popover>
					</FieldShell>
				)
			}}
		/>
	)
}

export default ProCombobox
