import { Suspense } from "react"
import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import AuthShell from "@/components/auth/AuthShell"
import { Link } from "@/i18n/navigation"
import LoginForm from "./LoginForm"

export async function generateMetadata(): Promise<Metadata> {
	const t = await getTranslations("auth")
	return { title: t("signIn"), robots: { index: false, follow: false } }
}

/**
 * One sign-in page for everyone. The API issues the same token shape to a
 * customer and to an admin, and the role in it decides where they land — so
 * there is no separate staff login to keep in step with this one.
 */
export default async function LoginPage() {
	const t = await getTranslations("auth")

	return (
		<AuthShell
			title={t("signIn")}
			subtitle={t("signInSubtitle")}
			footer={
				<p>
					{t("noAccount")}{" "}
					<Link href="/register" className="text-foreground underline underline-offset-4">
						{t("createAccount")}
					</Link>
				</p>
			}
		>
			{/* LoginForm reads ?redirect= with useSearchParams, which has to be
			    inside a Suspense boundary. */}
			<Suspense>
				<LoginForm />
			</Suspense>
		</AuthShell>
	)
}
