import type { ReactNode } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

/**
 * The top of an editor page: where you came from, what you are editing, and
 * what the thing is for.
 *
 * Exists because these editors used to be dialogs, where the title and the way
 * out came free with the modal. On a page both have to be built, and five
 * editors each building their own is five chances for the back link to point
 * somewhere slightly different.
 */
export const EditorHeader = ({
	backHref,
	backLabel,
	title,
	description,
	action,
}: {
	backHref: string
	backLabel: string
	title: string
	description?: ReactNode
	action?: ReactNode
}) => (
	<div className="flex flex-wrap items-start justify-between gap-3">
		<div className="min-w-0">
			<Link
				href={backHref}
				className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
			>
				<ArrowLeft className="size-4" />
				{backLabel}
			</Link>

			<h1 className="mt-2 text-xl font-semibold">{title}</h1>
			{description && <p className="text-muted-foreground mt-1 text-sm">{description}</p>}
		</div>

		{action}
	</div>
)

export default EditorHeader
