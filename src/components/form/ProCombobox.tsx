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
	className?: string
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
	className,
}: ProComboboxProps) => {
	const { control } = useFormContext()
	const t = useTranslations("common")

	const [open, setOpen] = useState(false)
	const [query, setQuery] = useState("")
	const [activeIndex, setActiveIndex] = useState(0)

	const listId = useId()
	const optionId = (index: number) => `${listId}-option-${index}`

	const inputRef = useRef<HTMLInputElement>(null)
	const listRef = useRef<HTMLUListElement>(null)

	const filtered = useMemo(() => {
		if (!query.trim()) return options
		const needle = fold(query.trim())
		return options.filter((option) =>
			[option.label, option.value, ...(option.keywords ?? [])].some((term) =>
				fold(term).includes(needle)
			)
		)
	}, [options, query])

	// Keep the highlight in range as the list shrinks, and scroll it into view.
	useEffect(() => {
		setActiveIndex((current) => Math.min(current, Math.max(filtered.length - 1, 0)))
	}, [filtered.length])

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
				const selected = options.find((option) => option.value === field.value)

				const choose = (option: ProComboboxOption) => {
					if (option.disabled) return
					field.onChange(option.value)
					setOpen(false)
					setQuery("")
				}

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
									// Open on the current choice rather than the top.
									const index = filtered.findIndex((o) => o.value === field.value)
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
										!selected && "text-muted-foreground"
									)}
								>
									{selected?.label ?? placeholder ?? t("select")}
									<ChevronsUpDownIcon className="opacity-50" />
								</Button>
							</PopoverTrigger>

							<PopoverContent
								align="start"
								className="w-(--radix-popover-trigger-width) p-0"
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

								<ul
									ref={listRef}
									id={listId}
									role="listbox"
									aria-label={label}
									className="max-h-64 overflow-y-auto p-1"
								>
									{filtered.map((option, index) => {
										const isActive = index === activeIndex
										const isSelected = option.value === field.value

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
												{option.label}
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
