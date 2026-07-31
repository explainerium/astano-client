import { useTranslations } from "next-intl"
import { Link } from "@/i18n/navigation"

/**
 * Placeholder home page. Exists so the routing layer is verifiable end to end:
 * the copy comes from the message catalogue and the links resolve to the
 * translated pathname for the active locale (/cart in English, /warenkorb in
 * German) without this file knowing which locale it is rendering.
 */
export default function HomePage() {
	const t = useTranslations("nav")

	return (
		<main className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col justify-center gap-8 px-6 py-24">
			<div className="space-y-3">
				<h1 className="font-heading text-4xl font-semibold tracking-tight">astano®</h1>
				<p className="text-muted-foreground max-w-prose">
					Custom stainless-steel baking hardware, made in Germany.
				</p>
			</div>

			<nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
				<Link className="underline underline-offset-4" href="/products">
					{t("products")}
				</Link>
				<Link className="underline underline-offset-4" href="/cart">
					{t("cart")}
				</Link>
				<Link className="underline underline-offset-4" href="/quote-basket">
					{t("quoteBasket")}
				</Link>
				<Link className="underline underline-offset-4" href="/account">
					{t("account")}
				</Link>
				<Link className="underline underline-offset-4" href="/login">
					{t("login")}
				</Link>
			</nav>
		</main>
	)
}
