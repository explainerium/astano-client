import type { Metadata } from "next"
import { getTranslations } from "next-intl/server"
import AuthShell from "@/components/auth/AuthShell"
import { Link } from "@/i18n/navigation"
import DealerForm from "./DealerForm"

export async function generateMetadata(): Promise<Metadata> {
	const t = await getTranslations("auth")
	return { title: t("dealerTitle"), description: t("dealerSubtitle") }
}

/**
 * B2B dealer registration — "Neu als Händler registrieren".
 *
 * Asks the same questions as B2C signup; the difference is the outcome. This
 * one creates a RESELLER with status PENDING and notifies staff, and wholesale
 * pricing only appears once an admin approves (§4.4).
 *
 * Indexable, unlike /login and /register — it is a marketing entry point the
 * header links to.
 */
export default async function DealerRegistrationPage() {
	const t = await getTranslations("auth")

	return (
		<AuthShell
			size="lg"
			title={t("dealerTitle")}
			subtitle={t("dealerSubtitle")}
			footer={
				<p>
					{t("hasAccount")}{" "}
					<Link href="/login" className="text-foreground underline underline-offset-4">
						{t("signIn")}
					</Link>
				</p>
			}
		>
			<DealerForm />
		</AuthShell>
	)
}
