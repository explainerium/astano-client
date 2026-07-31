import { Suspense } from "react"
import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import AuthShell from "@/components/auth/AuthShell"
import { Link } from "@/i18n/navigation"
import RegisterForm from "./RegisterForm"

export async function generateMetadata(): Promise<Metadata> {
	const t = await getTranslations("auth")
	return { title: t("createAccount"), robots: { index: false, follow: false } }
}

/**
 * B2C self-registration.
 *
 * Dealers do not come through here — the API cannot produce a RESELLER from a
 * request body at all, by design. Business customers apply on the dealer form,
 * which creates a PENDING account for an admin to approve (§4.4).
 */
export default async function RegisterPage() {
	const t = await getTranslations("auth")

	return (
		<AuthShell
			size="lg"
			title={t("createAccount")}
			subtitle={t("createAccountSubtitle")}
			footer={
				<>
					<p>
						{t("hasAccount")}{" "}
						<Link href="/login" className="text-foreground underline underline-offset-4">
							{t("signIn")}
						</Link>
					</p>
					<p className="mt-3 text-xs">
						<Link
							href="/dealer-registration"
							className="text-foreground underline underline-offset-4"
						>
							{t("dealerPrompt")}
						</Link>
					</p>
				</>
			}
		>
			<Suspense>
				<RegisterForm />
			</Suspense>
		</AuthShell>
	)
}
