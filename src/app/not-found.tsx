import Link from "next/link"
import { Mulish, Poppins } from "next/font/google"
import "./globals.css"

/**
 * The 404 for anything that never reached a locale.
 *
 * It renders its own `<html>` and `<body>`, which no other page here does. The
 * root layout is a deliberate passthrough — the storefront and the dashboard
 * each own their document shell — so a not-found rendered above both of them
 * has nothing to inherit. Without this, a URL whose first segment is not a
 * locale produced "Missing <html> and <body> tags in the root layout" instead
 * of a 404, because `[locale]/layout.tsx` calls notFound() before it gets as
 * far as opening the document.
 *
 * German only. The whole point of arriving here is that the URL said nothing
 * usable about which language was wanted, and German is the primary one; the
 * English line underneath covers the rest.
 */

const mulish = Mulish({ subsets: ["latin"], variable: "--font-mulish", display: "swap" })

const poppins = Poppins({
	subsets: ["latin"],
	weight: ["600", "800"],
	variable: "--font-poppins",
	display: "swap",
})

export default function NotFound() {
	return (
		<html lang="de" className={`${mulish.variable} ${poppins.variable} h-full antialiased`}>
			<body className="flex min-h-full flex-col">
				<main className="flex flex-1 items-center justify-center px-6 py-24">
					<div className="text-center">
						<p className="font-heading text-primary text-sm font-semibold tracking-[0.2em] uppercase">
							404
						</p>

						<h1 className="font-heading mt-4 text-3xl font-extrabold tracking-tight uppercase sm:text-4xl">
							Seite nicht gefunden
						</h1>

						<p className="text-muted-foreground mx-auto mt-4 max-w-prose text-sm leading-relaxed">
							Diese Adresse gibt es nicht. Möglicherweise ist der Link veraltet.
						</p>
						<p className="text-muted-foreground mx-auto mt-1 max-w-prose text-sm leading-relaxed">
							This page does not exist — the link may be out of date.
						</p>

						<div className="mt-8 flex flex-wrap items-center justify-center gap-3">
							{/* next/link, not the localised one: this sits outside the
							    locale tree, so there is no routing context to ask. */}
							<Link
								href="/"
								className="bg-primary text-primary-foreground inline-flex px-7 py-3 text-sm font-semibold tracking-wide uppercase transition-opacity hover:opacity-90"
							>
								Zur Startseite
							</Link>
							<Link
								href="/produkte"
								className="border-input inline-flex border px-7 py-3 text-sm font-semibold tracking-wide uppercase transition-colors hover:bg-neutral-100"
							>
								Zum Shop
							</Link>
						</div>
					</div>
				</main>
			</body>
		</html>
	)
}
