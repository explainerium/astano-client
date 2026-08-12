"use client"

import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { DropdownMenu } from "radix-ui"
import { ChevronDown, LogOut } from "lucide-react"
import type { UserRole } from "@/types"
import { useMeQuery } from "@/redux/api/authApi"
import useUserInfo from "@/hooks/useUserInfo"
import logoutUser from "@/services/actions/logoutUser"

const ROLE_LABEL: Partial<Record<UserRole, string>> = {
	ADMIN: "Admin",
	SHOP_MANAGER: "Shop manager",
}

export const UserMenu = () => {
	const t = useTranslations("admin")
	const router = useRouter()
	const { role } = useUserInfo()
	const { data: user } = useMeQuery()

	// The token carries the role, so the label is correct on first paint; the
	// name arrives with /auth/me a moment later and fills in without a flash.
	const name =
		[user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.email || "Signed in"
	const label = ROLE_LABEL[(user?.role ?? role) as UserRole] ?? "Staff"
	const initial = (user?.firstName ?? user?.email ?? "A").charAt(0).toUpperCase()

	const signOut = async () => {
		await logoutUser()
		router.replace("/login")
	}

	return (
		<DropdownMenu.Root>
			<DropdownMenu.Trigger className="hover:bg-muted flex items-center gap-2.5 rounded-lg py-1 pr-2 pl-1 transition-colors outline-none">
				<span className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-lg text-sm font-semibold">
					{initial}
				</span>
				<span className="hidden text-left leading-tight sm:block">
					<span className="block text-sm font-medium">{name}</span>
					<span className="text-muted-foreground block text-xs">{label}</span>
				</span>
				<ChevronDown className="text-muted-foreground size-4" />
			</DropdownMenu.Trigger>

			<DropdownMenu.Portal>
				<DropdownMenu.Content
					align="end"
					sideOffset={8}
					className="bg-card border-border z-50 min-w-52 rounded-lg border p-1.5 shadow-lg"
				>
					<div className="px-2.5 py-2">
						<p className="truncate text-sm font-medium">{name}</p>
						<p className="text-muted-foreground truncate text-xs">{user?.email}</p>
					</div>
					<DropdownMenu.Separator className="bg-border my-1 h-px" />
					<DropdownMenu.Item
						onSelect={signOut}
						className="hover:bg-muted flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm outline-none"
					>
						<LogOut className="size-4" />{t("signOut")}</DropdownMenu.Item>
				</DropdownMenu.Content>
			</DropdownMenu.Portal>
		</DropdownMenu.Root>
	)
}

export default UserMenu
