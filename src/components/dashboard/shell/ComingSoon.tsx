import { Construction } from "lucide-react"

/**
 * Placeholder for an admin screen that has a route and a nav entry but no
 * implementation yet.
 *
 * Exists so the sidebar never leads to a 404 — a dead link reads as a broken
 * app, whereas "not built yet, here is what it will do" reads as progress. Each
 * one states its scope so the remaining work is visible from inside the product
 * rather than only in the tracker.
 */
export const ComingSoon = ({
	title,
	description,
	willInclude,
}: {
	title: string
	description: string
	willInclude?: string[]
}) => (
	<div className="bg-card rounded-lg border border-dashed p-12 text-center">
		<Construction className="text-muted-foreground mx-auto size-8" strokeWidth={1.5} />
		<h2 className="font-heading mt-4 text-lg font-semibold">{title}</h2>
		<p className="text-muted-foreground mx-auto mt-2 max-w-prose text-sm">{description}</p>

		{willInclude && willInclude.length > 0 && (
			<div className="mx-auto mt-6 max-w-md text-left">
				<p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
					Will include
				</p>
				<ul className="text-muted-foreground space-y-1 text-sm">
					{willInclude.map((item) => (
						<li key={item} className="flex gap-2">
							<span aria-hidden>·</span>
							{item}
						</li>
					))}
				</ul>
			</div>
		)}
	</div>
)

export default ComingSoon
