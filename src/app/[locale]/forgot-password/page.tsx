import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import AuthShell from "@/components/auth/AuthShell"
import { Link } from "@/i18n/navigation"
import ForgotPasswordForm from "./ForgotPasswordForm"

export async function generateMetadata(): Promise<Metadata> {
	const t = await getTranslations("auth")
	return { title: t("forgotPasswordTitle"), robots: { index: false, follow: false } }
}

export default async function ForgotPasswordPage() {
	const t = await getTranslations("auth")

	return (
		<AuthShell
			title={t("forgotPasswordTitle")}
			subtitle={t("forgotPasswordSubtitle")}
			footer={
				<p>
					<Link href="/login" className="text-foreground underline underline-offset-4">
						{t("backToSignIn")}
					</Link>
				</p>
			}
		>
			<ForgotPasswordForm />
		</AuthShell>
	)
}
