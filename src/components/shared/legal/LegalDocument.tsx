import SiteFooter from "@/components/shared/footer/SiteFooter"
import SiteHeader from "@/components/shared/header/SiteHeader"
import { loadLegalDocument, type LegalSlug } from "@/content/legal"

/**
 * Shared shell for Impressum, Datenschutz and AGB.
 *
 * The body is injected as HTML. That is safe here and only here: the markup
 * comes from our own generated files, reduced at extraction time to an
 * allowlist of text tags with every attribute stripped except href. Nothing
 * user-supplied reaches this component.
 *
 * Typography is applied with descendant variants rather than a prose plugin —
 * the documents use six tags between them, which does not justify a
 * dependency.
 */
export const LegalDocument = async ({
	slug,
	locale,
}: {
	slug: LegalSlug
	locale: string
}) => {
	const document = await loadLegalDocument(slug, locale)

	return (
		<>
			<SiteHeader locale={locale} />

			<main className="flex-1">
				<section className="bg-neutral-900">
					<div className="mx-auto w-full max-w-[1400px] px-6 py-16 text-center">
						<h1 className="font-heading text-3xl font-extrabold tracking-tight text-white uppercase sm:text-4xl">
							{document.title}
						</h1>
					</div>
				</section>

				<article
					className={[
						"mx-auto w-full max-w-[860px] px-6 py-16 break-words",
						"[&_h2]:font-heading [&_h2]:mt-12 [&_h2]:mb-4 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:first:mt-0",
						"[&_h3]:font-heading [&_h3]:mt-8 [&_h3]:mb-3 [&_h3]:text-lg [&_h3]:font-semibold",
						"[&_p]:text-muted-foreground [&_p]:mb-4 [&_p]:text-sm [&_p]:leading-relaxed",
						"[&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-6",
						"[&_ol]:mb-4 [&_ol]:list-decimal [&_ol]:pl-6",
						"[&_li]:text-muted-foreground [&_li]:mt-1 [&_li]:text-sm [&_li]:leading-relaxed",
						"[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2",
						"[&_strong]:text-foreground [&_strong]:font-semibold",
						"[&_b]:text-foreground [&_b]:font-semibold",
					].join(" ")}
					dangerouslySetInnerHTML={{ __html: document.html }}
				/>
			</main>

			<SiteFooter locale={locale} />
		</>
	)
}

export default LegalDocument
