"use client"

import { useEffect, useState } from "react"
import type { AccessTokenPayload } from "@/types"
import { getUserInfo } from "@/services/auth.services"

/**
 * Who is signed in, for client components.
 *
 * Resolved in an effect rather than during render because the cookie is not
 * readable on the server — reading it during render would make the server and
 * client markup disagree and trigger a hydration error. `undefined` therefore
 * means "not determined yet" and is distinct from `null`, which means "signed
 * out"; a header that treats the two the same will flash a Sign-in link at
 * users who are already signed in.
 */
const useUserInfo = () => {
	const [userInfo, setUserInfo] = useState<AccessTokenPayload | null | undefined>(undefined)

	useEffect(() => {
		setUserInfo(getUserInfo())
	}, [])

	return {
		userInfo,
		isResolved: userInfo !== undefined,
		isLoggedIn: !!userInfo,
		/** Signed in AND approved. A PENDING Reseller is the former, not the latter. */
		isActive: userInfo?.status === "ACTIVE",
		role: userInfo?.role,
		status: userInfo?.status,
	}
}

export default useUserInfo
