/**
 * How authored HTML is styled, in one place.
 *
 * Tailwind's preflight strips headings back to body text and takes the markers
 * and indent off lists. Without something putting them back, pressing Heading
 * or Bullet list in the editor changes the document and changes nothing on
 * screen — which reads as the button being broken. That is exactly what
 * happened here: the editor carried a `prose-sm` class for a typography plugin
 * the project does not install.
 *
 * Descendant variants rather than that plugin, which is the pattern the legal
 * pages already use: the tag list is short, it keeps the dependency out, and
 * the styling stays in the same vocabulary as everything else.
 *
 * The point of sharing it is that the editor and the storefront agree. A
 * heading has to look like a heading in both, or "what you see is what you get"
 * is a lie and staff format their copy against a preview that misleads them.
 */

/** Block structure — headings, lists, quotes, rules. */
const BLOCKS = [
	"[&_h1]:font-heading [&_h1]:mt-8 [&_h1]:mb-4 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:first:mt-0",
	"[&_h2]:font-heading [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:first:mt-0",
	"[&_h3]:font-heading [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:first:mt-0",
	"[&_h4]:font-heading [&_h4]:mt-6 [&_h4]:mb-2 [&_h4]:text-base [&_h4]:font-semibold [&_h4]:first:mt-0",
	"[&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-6",
	"[&_ol]:mb-4 [&_ol]:list-decimal [&_ol]:pl-6",
	// Nested lists take the second-level marker and lose the doubled gap.
	"[&_li>ul]:mt-1 [&_li>ul]:mb-0 [&_li>ul]:list-[circle] [&_li>ol]:mt-1 [&_li>ol]:mb-0 [&_li>ol]:list-[lower-alpha]",
	"[&_blockquote]:border-border [&_blockquote]:text-muted-foreground [&_blockquote]:my-4 [&_blockquote]:border-l-2 [&_blockquote]:pl-4 [&_blockquote]:italic",
	"[&_hr]:border-border [&_hr]:my-8",
	"[&_pre]:bg-muted [&_pre]:my-4 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:p-3 [&_pre]:text-xs",
].join(" ")

/** Inline runs — text, emphasis, links, code. */
const INLINE = [
	"[&_p]:mb-4 [&_p]:text-sm [&_p]:leading-relaxed [&_p]:last:mb-0",
	"[&_li]:mt-1 [&_li]:text-sm [&_li]:leading-relaxed",
	"[&_strong]:font-semibold",
	"[&_em]:italic",
	"[&_s]:line-through",
	"[&_u]:underline [&_u]:underline-offset-2",
	"[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2",
	"[&_code]:bg-muted [&_code]:rounded [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[0.85em]",
	// The <pre> above already sets the block styling; the inner <code> must not
	// paint its own background on top of it.
	"[&_pre_code]:bg-transparent [&_pre_code]:p-0",
].join(" ")

/**
 * For the editing surface. Body text stays at full strength here — muting it
 * would make the field look disabled.
 */
export const richTextEditorClass = `${BLOCKS} ${INLINE} break-words`

/**
 * For rendering stored HTML on the site, where body copy is the quieter
 * secondary colour the rest of the storefront uses.
 */
export const richTextClass = `${BLOCKS} ${INLINE} [&_p]:text-muted-foreground [&_li]:text-muted-foreground break-words`
