import { Suspense } from "react"
import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import AuthShell from "@/components/auth/AuthShell"
import { Link } from "@/i18n/navigation"
import ResetPasswordForm from "./ResetPasswordForm"

export async function generateMetadata(): Promise<Metadata> {
	const t = await getTranslations("auth")
	return { title: t("resetPasswordTitle"), robots: { index: false, follow: false } }
}

export default async function ResetPasswordPage() {
	const t = await getTranslations("auth")

	return (
		<AuthShell
			title={t("resetPasswordTitle")}
			subtitle={t("resetPasswordSubtitle")}
			footer={
				<p>
					<Link href="/login" className="text-foreground underline underline-offset-4">
						{t("backToSignIn")}
					</Link>
				</p>
			}
		>
			{/* Reads ?token= with useSearchParams, which needs a Suspense boundary. */}
			<Suspense>
				<ResetPasswordForm />
			</Suspense>
		</AuthShell>
	)
}
