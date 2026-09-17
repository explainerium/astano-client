"use client"

import { useState } from "react"
import { CheckCircle2, Loader2, Sparkles, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTestAiKeyMutation } from "@/redux/api/aiApi"
import type { AiTestResult } from "@/types/ai"

/**
 * Asks the AI service one question and reports what it said.
 *
 * A key is a long string that looks equally right whether it came from the
 * correct account, whether there is credit on it, and whether the model named
 * beside it exists. All three fail identically at the moment somebody in the
 * middle of writing a product presses the button in the editor — which is the
 * worst possible time to find out.
 *
 * So the provider's own sentence is shown verbatim: "Your credit balance is too
 * low" and "invalid x-api-key" are different problems with different fixes, and
 * any wording of ours would be a guess at which.
 *
 * Outside the settings form on purpose. It saves nothing, and a button inside a
 * form is a button that submits it.
 */
export const AiKeyTestCard = () => {
	const [result, setResult] = useState<AiTestResult | null>(null)
	const [testAiKey, { isLoading }] = useTestAiKeyMutation()

	const run = async () => {
		setResult(null)

		try {
			setResult(await testAiKey().unwrap())
		} catch (error) {
			// A refusal from the provider comes back 200 with `ok: false`, so
			// reaching here means the request itself failed — the session expired,
			// or the API is unreachable.
			const message = (error as { data?: { message?: string } })?.data?.message
			setResult({
				ok: false,
				message: message ?? "The request could not be made.",
				provider: "anthropic",
				model: "",
			})
		}
	}

	return (
		<section className="bg-card space-y-4 rounded-lg border p-5">
			<div>
				<h3 className="text-sm font-semibold">Test the key</h3>
				<p className="text-muted-foreground mt-1 max-w-prose text-sm">
					Sends one very short request and shows the answer. It costs a fraction of a cent and
					proves the key, the credit and the model in one go.
				</p>
			</div>

			<Button type="button" onClick={run} disabled={isLoading} aria-busy={isLoading}>
				{isLoading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
				{isLoading ? "Asking…" : "Send a test request"}
			</Button>

			{result && (
				<div
					role="status"
					className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${
						result.ok
							? "border-emerald-600/30 bg-emerald-600/10"
							: "border-destructive/30 bg-destructive/10"
					}`}
				>
					{result.ok ? (
						<CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
					) : (
						<XCircle className="text-destructive mt-0.5 size-4 shrink-0" />
					)}
					<div className="min-w-0">
						<p className="break-words">{result.message}</p>
						{result.model && (
							<p className="text-muted-foreground mt-1 text-xs">
								{result.provider === "openai" ? "OpenAI" : "Anthropic"} · {result.model}
							</p>
						)}
					</div>
				</div>
			)}
		</section>
	)
}

export default AiKeyTestCard
