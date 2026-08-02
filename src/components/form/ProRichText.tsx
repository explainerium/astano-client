"use client"

import { useEffect } from "react"
import { Controller, useFormContext } from "react-hook-form"
import { EditorContent, useEditor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import {
	Bold,
	Heading2,
	Italic,
	List,
	ListOrdered,
	Redo2,
	Strikethrough,
	Undo2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import FieldShell from "./FieldShell"

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
	const editor = useEditor({
		extensions: [StarterKit],
		content: value,
		immediatelyRender: false,
		editorProps: {
			attributes: {
				id: name,
				class: "prose-sm max-w-none focus:outline-none",
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
						label="Strikethrough"
						active={editor?.isActive("strike")}
						onClick={() => editor?.chain().focus().toggleStrike().run()}
					>
						<Strikethrough className="size-4" />
					</ToolbarButton>

					<span className="bg-border mx-1 h-5 w-px" />

					<ToolbarButton
						label="Heading"
						active={editor?.isActive("heading", { level: 2 })}
						onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
					>
						<Heading2 className="size-4" />
					</ToolbarButton>
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

				<EditorContent editor={editor} className="px-3 py-2 text-sm" />
			</div>
		</FieldShell>
	)
}

export default ProRichText
