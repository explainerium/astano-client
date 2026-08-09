"use client"

import { useState } from "react"
import { Loader2, Monitor, Smartphone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useEmailPreviewQuery } from "@/redux/api/emailApi"
import { cn } from "@/lib/utils"

/**
 * The message as it will arrive.
 *
 * Rendered in a sandboxed iframe with `srcDoc`. The HTML is composed from
 * admin-written content and shown inside the dashboard, so it must not be able
 * to reach the page around it: no scripts, no same-origin access, no top-level
 * navigation. Nothing in an email needs any of the three.
 *
 * The narrow width is not decoration — a 600px table is the whole layout, and
 * an admin who only ever sees it full-width will not notice the day it stops
 * fitting a phone.
 */
export const EmailPreview = ({ kind }: { kind: string }) => {
	const [locale, setLocale] = useState("en")
	const [narrow, setNarrow] = useState(false)
	const [showText, setShowText] = useState(false)

	const { data, isFetching, isError } = useEmailPreviewQuery({ kind, locale })

	return (
		<div className="space-y-3">
			<div className="flex flex-wrap items-center gap-2">
				<div className="bg-muted flex rounded-md p-0.5">
					{["en", "de"].map((code) => (
						<button
							key={code}
							type="button"
							onClick={() => setLocale(code)}
							className={cn(
								"rounded px-3 py-1 text-xs font-medium uppercase transition-colors",
								locale === code ? "bg-background shadow-sm" : "text-muted-foreground"
							)}
						>
							{code}
						</button>
					))}
				</div>

				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={() => setNarrow((v) => !v)}
					aria-pressed={narrow}
				>
					{narrow ? <Smartphone className="size-4" /> : <Monitor className="size-4" />}
					{narrow ? "Phone" : "Desktop"}
				</Button>

				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={() => setShowText((v) => !v)}
					aria-pressed={showText}
				>
					{showText ? "HTML" : "Plain text"}
				</Button>

				{isFetching && <Loader2 className="text-muted-foreground size-4 animate-spin" />}
			</div>

			{!!data && (
				<p className="text-muted-foreground truncate text-sm">
					<span className="font-medium">Subject:</span> {data.subject}
				</p>
			)}

			{isError && <p className="text-destructive text-sm">Could not render this email.</p>}

			{!!data &&
				(showText ? (
					// The fallback every client can read, and the only version some
					// will. Worth being able to look at.
					<pre className="bg-muted max-h-[600px] overflow-auto rounded-md p-4 font-mono text-xs whitespace-pre-wrap">
						{data.text}
					</pre>
				) : (
					<div className="bg-muted flex justify-center overflow-hidden rounded-md">
						<iframe
							title="Email preview"
							srcDoc={data.html}
							sandbox=""
							className={cn(
								"h-[600px] border-0 bg-white transition-[width]",
								narrow ? "w-[380px]" : "w-full"
							)}
						/>
					</div>
				))}
		</div>
	)
}

export default EmailPreview
