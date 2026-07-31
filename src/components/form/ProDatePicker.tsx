"use client"

import { Controller, useFormContext } from "react-hook-form"
import { format, isValid, parseISO } from "date-fns"
import { de, enGB } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import FieldShell from "./FieldShell"

export interface ProDatePickerProps {
	name: string
	label?: string
	description?: string
	required?: boolean
	disabled?: boolean
	className?: string
	/** Earliest selectable year. Defaults to 1900 — founding dates go back a long way. */
	fromYear?: number
}

/**
 * Date field backed by the shadcn calendar.
 *
 * The form value stays an ISO `yyyy-MM-dd` string rather than a Date object:
 * that is what the API's z.coerce.date() expects, it survives JSON without a
 * timezone shifting the day, and an empty field stays "" instead of becoming
 * an Invalid Date.
 *
 * The month and year dropdowns matter here. A founding date can be decades
 * back, and paging a month at a time to reach 1974 is not a date picker.
 */
export const ProDatePicker = ({
	name,
	label,
	description,
	required,
	disabled,
	className,
	fromYear = 1900,
}: ProDatePickerProps) => {
	const { control } = useFormContext()
	const locale = useLocale()
	const t = useTranslations("common")

	const dateLocale = locale === "de" ? de : enGB
	const today = new Date()

	return (
		<Controller
			control={control}
			name={name}
			render={({ field, fieldState: { error } }) => {
				const parsed = field.value ? parseISO(String(field.value)) : undefined
				const selected = parsed && isValid(parsed) ? parsed : undefined

				return (
					<FieldShell
						name={name}
						label={label}
						description={description}
						error={error?.message}
						required={required}
						className={className}
					>
						<Popover>
							<PopoverTrigger asChild>
								<Button
									id={name}
									type="button"
									variant="outline"
									size="lg"
									disabled={disabled}
									aria-invalid={!!error}
									className={cn(
										"w-full justify-start font-normal",
										!selected && "text-muted-foreground"
									)}
								>
									<CalendarIcon />
									{selected
										? format(selected, "PPP", { locale: dateLocale })
										: t("selectDate")}
								</Button>
							</PopoverTrigger>

							<PopoverContent className="w-auto p-0" align="start">
								<Calendar
									mode="single"
									selected={selected}
									onSelect={(date) =>
										field.onChange(date ? format(date, "yyyy-MM-dd") : "")
									}
									defaultMonth={selected}
									captionLayout="dropdown"
									startMonth={new Date(fromYear, 0)}
									endMonth={today}
									disabled={{ after: today }}
									locale={dateLocale}
									autoFocus
								/>
							</PopoverContent>
						</Popover>
					</FieldShell>
				)
			}}
		/>
	)
}

export default ProDatePicker
