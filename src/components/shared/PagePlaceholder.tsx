/**
 * Storefront placeholder.
 *
 * Every path declared in the routing `pathnames` map needs a page, or the
 * translated URL 404s — and links from the admin (a category's storefront link,
 * a product's) point straight at these. Deliberately plain: the real pages get
 * the §6.1 design and translated copy, and dressing up a stub would only make
 * it harder to tell what is finished.
 */
export const PagePlaceholder = ({
	title,
	note,
}: {
	title: string
	note?: string
}) => (
	<main className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col justify-center gap-3 px-6 py-24">
		<h1 className="font-heading text-3xl font-semibold tracking-tight">{title}</h1>
		<p className="text-muted-foreground max-w-prose text-sm">
			{note ?? "This page is not built yet."}
		</p>
	</main>
)

export default PagePlaceholder
