"use client"

import { useEffect, useState } from "react"
import { Controller, useFormContext } from "react-hook-form"
import { EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import {
	Bold,
	Code,
	Eraser,
	Heading1,
	Heading2,
	Heading3,
	Heading4,
	Italic,
	Link2,
	Link2Off,
	List,
	ListOrdered,
	Minus,
	Pilcrow,
	Quote,
	Redo2,
	Strikethrough,
	Underline as UnderlineIcon,
	Undo2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { richTextEditorClass } from "@/lib/richText"
import FieldShell from "./FieldShell"

/**
 * Four levels, matching what StarterKit is configured to allow above.
 *
 * h1 is offered even though the storefront prints the product name as the page
 * h1: staff also write standalone pages here, and the level they mean is a
 * judgement about their own copy, not something this field should overrule.
 */
const HEADINGS = [
	{ level: 1 as const, Icon: Heading1 },
	{ level: 2 as const, Icon: Heading2 },
	{ level: 3 as const, Icon: Heading3 },
	{ level: 4 as const, Icon: Heading4 },
]

export interface ProRichTextProps {
	name: string
	label?: string
	description?: string
	required?: boolean
	className?: string
	/** Roughly how tall the writing area starts. */
	minHeight?: string
}

const ToolbarButton = ({
	active,
	disabled,
	label,
	onClick,
	children,
}: {
	active?: boolean
	disabled?: boolean
	label: string
	onClick: () => void
	children: React.ReactNode
}) => (
	<button
		type="button"
		onClick={onClick}
		disabled={disabled}
		aria-label={label}
		aria-pressed={active}
		title={label}
		className={cn(
			"hover:bg-muted flex size-8 items-center justify-center rounded-md transition-colors disabled:opacity-40",
			active && "bg-muted text-foreground"
		)}
	>
		{children}
	</button>
)

/**
 * Rich text field, stored as HTML.
 *
 * The API's description fields already take HTML, and the products being
 * migrated were written in WordPress's editor, so plain text would be a
 * downgrade the client would feel immediately.
 *
 * `immediatelyRender: false` matters here: TipTap renders on mount, and letting
 * it do so during SSR produces markup React then disagrees with on hydration.
 */
export const ProRichText = ({
	name,
	label,
	description,
	required,
	className,
	minHeight = "10rem",
}: ProRichTextProps) => {
	const { control } = useFormContext()

	return (
		<Controller
			control={control}
			name={name}
			render={({ field, fieldState: { error } }) => (
				<RichTextEditor
					name={name}
					label={label}
					description={description}
					required={required}
					className={className}
					minHeight={minHeight}
					value={typeof field.value === "string" ? field.value : ""}
					onChange={field.onChange}
					onBlur={field.onBlur}
					error={error?.message}
				/>
			)}
		/>
	)
}

const RichTextEditor = ({
	name,
	label,
	description,
	required,
	className,
	minHeight,
	value,
	onChange,
	onBlur,
	error,
}: Omit<ProRichTextProps, "minHeight"> & {
	minHeight: string
	value: string
	onChange: (html: string) => void
	onBlur: () => void
	error?: string
}) => {
	const [linkOpen, setLinkOpen] = useState(false)
	const [linkDraft, setLinkDraft] = useState("")

	const editor = useEditor({
		extensions: [
			StarterKit.configure({
				// Four levels is what the catalogue copy actually uses. Allowing
				// h5 and h6 as well would offer a distinction nothing in the
				// storefront's type scale draws.
				heading: { levels: [1, 2, 3, 4] },
				link: {
					// Clicking a link inside the field should put the cursor in it,
					// not navigate away from the form being edited.
					openOnClick: false,
					// Which schemes a bare URL is recognised as. The extension refuses
					// dangerous hrefs on its own; this only says what counts as a link
					// worth detecting while typing.
					protocols: ["http", "https", "mailto", "tel"],
					HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" },
				},
			}),
		],
		content: value,
		immediatelyRender: false,
		editorProps: {
			attributes: {
				id: name,
				// The same styling the storefront applies to the saved HTML, so the
				// field is a preview rather than an approximation.
				class: cn(richTextEditorClass, "focus:outline-none"),
				style: `min-height:${minHeight}`,
			},
		},
		onUpdate: ({ editor }) => {
			// `isEmpty` rather than the raw HTML: an empty document still
			// serialises to "<p></p>", which would save as content and make a
			// blank field look filled on the next load.
			onChange(editor.isEmpty ? "" : editor.getHTML())
		},
		onBlur,
	})

	/**
	 * Push external changes in — the form is reset when a different product
	 * loads, and the editor holds its own document that would otherwise keep
	 * showing the previous one.
	 */
	useEffect(() => {
		if (!editor) return
		const current = editor.isEmpty ? "" : editor.getHTML()
		if (value !== current) editor.commands.setContent(value, { emitUpdate: false })
	}, [editor, value])

	const applyLink = () => {
		if (!editor) return
		const href = linkDraft.trim()

		// An empty box means "remove it" — the alternative is a second trip to
		// the unlink button for what the customer already expressed here.
		if (!href) editor.chain().focus().unsetLink().run()
		else editor.chain().focus().extendMarkRange("link").setLink({ href }).run()

		setLinkOpen(false)
	}

	return (
		<FieldShell
			name={name}
			label={label}
			description={description}
			error={error}
			required={required}
			className={className}
		>
			<div
				className={cn(
					"border-input bg-background overflow-hidden rounded-lg border",
					error && "border-destructive"
				)}
			>
				<div className="border-border flex flex-wrap items-center gap-0.5 border-b px-1.5 py-1">
					<ToolbarButton
						label="Paragraph"
						active={editor?.isActive("paragraph")}
						onClick={() => editor?.chain().focus().setParagraph().run()}
					>
						<Pilcrow className="size-4" />
					</ToolbarButton>

					{HEADINGS.map(({ level, Icon }) => (
						<ToolbarButton
							key={level}
							label={`Heading ${level}`}
							active={editor?.isActive("heading", { level })}
							onClick={() => editor?.chain().focus().toggleHeading({ level }).run()}
						>
							<Icon className="size-4" />
						</ToolbarButton>
					))}

					<span className="bg-border mx-1 h-5 w-px" />

					<ToolbarButton
						label="Bold"
						active={editor?.isActive("bold")}
						onClick={() => editor?.chain().focus().toggleBold().run()}
					>
						<Bold className="size-4" />
					</ToolbarButton>
					<ToolbarButton
						label="Italic"
						active={editor?.isActive("italic")}
						onClick={() => editor?.chain().focus().toggleItalic().run()}
					>
						<Italic className="size-4" />
					</ToolbarButton>
					<ToolbarButton
						label="Underline"
						active={editor?.isActive("underline")}
						onClick={() => editor?.chain().focus().toggleUnderline().run()}
					>
						<UnderlineIcon className="size-4" />
					</ToolbarButton>
					<ToolbarButton
						label="Strikethrough"
						active={editor?.isActive("strike")}
						onClick={() => editor?.chain().focus().toggleStrike().run()}
					>
						<Strikethrough className="size-4" />
					</ToolbarButton>
					<ToolbarButton
						label="Inline code"
						active={editor?.isActive("code")}
						onClick={() => editor?.chain().focus().toggleCode().run()}
					>
						<Code className="size-4" />
					</ToolbarButton>

					<span className="bg-border mx-1 h-5 w-px" />

					<ToolbarButton
						label="Bullet list"
						active={editor?.isActive("bulletList")}
						onClick={() => editor?.chain().focus().toggleBulletList().run()}
					>
						<List className="size-4" />
					</ToolbarButton>
					<ToolbarButton
						label="Numbered list"
						active={editor?.isActive("orderedList")}
						onClick={() => editor?.chain().focus().toggleOrderedList().run()}
					>
						<ListOrdered className="size-4" />
					</ToolbarButton>
					<ToolbarButton
						label="Quote"
						active={editor?.isActive("blockquote")}
						onClick={() => editor?.chain().focus().toggleBlockquote().run()}
					>
						<Quote className="size-4" />
					</ToolbarButton>
					<ToolbarButton
						label="Divider"
						onClick={() => editor?.chain().focus().setHorizontalRule().run()}
					>
						<Minus className="size-4" />
					</ToolbarButton>

					<span className="bg-border mx-1 h-5 w-px" />

					<ToolbarButton
						label="Link"
						active={editor?.isActive("link")}
						onClick={() => {
							// Seeded with the existing href when the cursor is already in
							// a link, so the button edits rather than only ever adds.
							setLinkDraft(String(editor?.getAttributes("link").href ?? ""))
							setLinkOpen(true)
						}}
					>
						<Link2 className="size-4" />
					</ToolbarButton>
					<ToolbarButton
						label="Remove link"
						disabled={!editor?.isActive("link")}
						onClick={() => editor?.chain().focus().unsetLink().run()}
					>
						<Link2Off className="size-4" />
					</ToolbarButton>
					<ToolbarButton
						label="Clear formatting"
						onClick={() => editor?.chain().focus().unsetAllMarks().clearNodes().run()}
					>
						<Eraser className="size-4" />
					</ToolbarButton>

					<span className="bg-border mx-1 h-5 w-px" />

					<ToolbarButton
						label="Undo"
						disabled={!editor?.can().undo()}
						onClick={() => editor?.chain().focus().undo().run()}
					>
						<Undo2 className="size-4" />
					</ToolbarButton>
					<ToolbarButton
						label="Redo"
						disabled={!editor?.can().redo()}
						onClick={() => editor?.chain().focus().redo().run()}
					>
						<Redo2 className="size-4" />
					</ToolbarButton>
				</div>

				{/* An inline row rather than window.prompt, which is unstyled, blocks
				    the tab, and is suppressed outright by some browsers. */}
				{linkOpen && (
					<div className="border-border bg-muted/40 flex items-center gap-2 border-b px-2 py-1.5">
						<input
							type="url"
							autoFocus
							value={linkDraft}
							placeholder="https://…"
							onChange={(event) => setLinkDraft(event.target.value)}
							onKeyDown={(event) => {
								if (event.key === "Enter") {
									event.preventDefault()
									applyLink()
								}
								if (event.key === "Escape") setLinkOpen(false)
							}}
							className="border-input bg-background min-w-0 flex-1 rounded-md border px-2 py-1 text-sm outline-none"
						/>
						<button
							type="button"
							onClick={applyLink}
							className="text-primary px-2 py-1 text-sm font-medium"
						>
							Apply
						</button>
						<button
							type="button"
							onClick={() => setLinkOpen(false)}
							className="text-muted-foreground px-2 py-1 text-sm"
						>
							Cancel
						</button>
					</div>
				)}

				<EditorContent editor={editor} className="px-3 py-2 text-sm" />
			</div>
		</FieldShell>
	)
}

export default ProRichText
