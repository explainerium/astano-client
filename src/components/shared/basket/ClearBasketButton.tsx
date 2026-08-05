"use client"

import { useTranslations } from "next-intl"
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

/**
 * "Empty basket", behind a confirmation.
 *
 * Deliberately not `window.confirm`: a native dialog blocks the whole page,
 * cannot be styled, and reads as a browser warning rather than part of the
 * shop. This is the same shadcn dialog the rest of the app uses.
 */
export const ClearBasketButton = ({
	label,
	confirmMessage,
	disabled,
	onConfirm,
}: {
	label: string
	confirmMessage: string
	disabled?: boolean
	onConfirm: () => void
}) => {
	const t = useTranslations("common")

	return (
		<AlertDialog>
			<AlertDialogTrigger
				disabled={disabled}
				className="text-muted-foreground hover:text-destructive text-sm underline underline-offset-2 disabled:opacity-40"
			>
				{label}
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{label}</AlertDialogTitle>
					<AlertDialogDescription>{confirmMessage}</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
					<AlertDialogAction onClick={onConfirm}>{t("confirm")}</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}

export default ClearBasketButton
