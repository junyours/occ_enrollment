import React, {
    useEffect,
    useId,
    useRef,
    useState,
} from 'react'

import {
    EditorContent,
    useEditor,
    useEditorState,
} from '@tiptap/react'

import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'

import {
    Bold,
    Italic,
    Link2,
    List,
    ListOrdered,
    Underline,
    Unlink,
} from 'lucide-react'

import { Button } from '@/Components/ui/button'
import { Input } from '@/Components/ui/input'

import {
    normalizeLink,
    richTextClassName,
    sanitizeRichHtml,
} from './richText'

const extensions = [
    StarterKit.configure({
        blockquote: false,
        code: false,
        codeBlock: false,
        heading: false,
        horizontalRule: false,
        link: false,
        strike: false,
        trailingNode: false,
    }),

    Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        defaultProtocol: 'https',

        HTMLAttributes: {
            target: '_blank',
            rel: 'noopener noreferrer',
        },

        isAllowedUri: (url, context) => (
            context.defaultValidate(url)
            && /^(?:https?:\/\/|mailto:)/i.test(url)
            && normalizeLink(url) !== null
        ),
    }),
]

const tools = [
    {
        name: 'bold',
        label: 'Bold',
        Icon: Bold,
        command: 'toggleBold',
    },
    {
        name: 'italic',
        label: 'Italic',
        Icon: Italic,
        command: 'toggleItalic',
    },
    {
        name: 'underline',
        label: 'Underline',
        Icon: Underline,
        command: 'toggleUnderline',
    },
    {
        name: 'bulletList',
        label: 'Bulleted list',
        Icon: List,
        command: 'toggleBulletList',
    },
    {
        name: 'orderedList',
        label: 'Numbered list',
        Icon: ListOrdered,
        command: 'toggleOrderedList',
    },
]

// `optional` adds a muted "(optional)" to the label; `autoFocus` puts the
// cursor at the end of the text once the editor is ready. `compact` starts
// smaller and drops the visible label and tips (the box still has `label`
// as its name); `placeholder` shows while it is empty.
export default function RichTextEditor({
    value,
    onChange,
    label = 'Instructions',
    disabled = false,
    optional = false,
    autoFocus = false,
    compact = false,
    placeholder = '',
}) {
    const [linkOpen, setLinkOpen] = useState(false)
    const [linkText, setLinkText] = useState('')
    const [linkUrl, setLinkUrl] = useState('')
    const [linkError, setLinkError] = useState('')

    const selection = useRef(null)
    const linkId = useId()

    const editor = useEditor({
        extensions,
        immediatelyRender: false,
        content: sanitizeRichHtml(value),
        editable: !disabled,
        autofocus: autoFocus ? 'end' : false,

        editorProps: {
            attributes: {
                role: 'textbox',
                'aria-label': label,
                'aria-multiline': 'true',
                class: `${richTextClassName} ${compact ? 'min-h-[88px]' : 'min-h-[160px]'} px-3 py-3 outline-none`,
            },

            transformPastedHTML: sanitizeRichHtml,
        },

        onUpdate: ({ editor: current }) => {
            onChange(
                current.isEmpty ? '' : current.getHTML()
            )
        },
    })

    const active = useEditorState({
        editor,

        selector: ({ editor: current }) => ({
            ...Object.fromEntries(
                tools.map(({ name }) => [
                    name,
                    current?.isActive(name) ?? false,
                ])
            ),

            link: current?.isActive('link') ?? false,
            empty: current?.isEmpty ?? true,
        }),
    })

    useEffect(() => {
        if (!editor) return

        const next = sanitizeRichHtml(value)

        const current = editor.isEmpty
            ? ''
            : editor.getHTML()

        if (next !== current) {
            editor.commands.setContent(next, {
                emitUpdate: false,
            })
        }
    }, [editor, value])

    useEffect(() => {
        editor?.setEditable(
            !disabled && !linkOpen,
            false
        )
    }, [editor, disabled, linkOpen])

    function openLink() {
        if (!editor || disabled) return

        editor
            .chain()
            .focus()
            .extendMarkRange('link')
            .run()

        const { from, to } = editor.state.selection

        const text = editor.state.doc.textBetween(
            from,
            to,
            ' '
        )

        selection.current = { from, to, text }

        setLinkText(text)
        setLinkUrl(editor.getAttributes('link').href || '')
        setLinkError('')
        setLinkOpen(true)
    }

    function closeLink() {
        setLinkOpen(false)
        editor?.setEditable(!disabled, false)
        editor?.commands.focus()
    }

    function saveLink() {
        if (
            !editor
            || disabled
            || !selection.current
        ) {
            return
        }

        const href = normalizeLink(linkUrl)

        if (!href) {
            setLinkError(
                'Enter a valid https://, http://, or mailto: link.'
            )
            return
        }

        const { from, to, text } = selection.current

        editor.setEditable(true, false)

        if (
            from === to
            || linkText.trim() !== text
        ) {
            editor
                .chain()
                .focus()
                .insertContentAt(
                    { from, to },
                    {
                        type: 'text',
                        text: linkText.trim() || href,
                        marks: [
                            {
                                type: 'link',
                                attrs: { href },
                            },
                        ],
                    }
                )
                .run()
        } else {
            // Preserve formatting on the selected text.
            editor
                .chain()
                .focus()
                .setTextSelection({ from, to })
                .setLink({ href })
                .run()
        }

        closeLink()
    }

    function removeLink() {
        if (
            !editor
            || disabled
            || !selection.current
        ) {
            return
        }

        editor.setEditable(true, false)

        editor
            .chain()
            .focus()
            .setTextSelection(selection.current)
            .extendMarkRange('link')
            .unsetLink()
            .run()

        closeLink()
    }

    return (
        <div className="space-y-2">
            {!compact && (
                <p className="text-sm font-medium">
                    {label}
                    {optional && <span className="font-normal text-muted-foreground"> (optional)</span>}
                </p>
            )}

            <div
                className={`overflow-hidden rounded-md border bg-background focus-within:ring-2 focus-within:ring-ring/50 ${disabled ? 'opacity-60' : ''
                    }`}
            >
                <div
                    role="group"
                    aria-label={`${label} formatting`}
                    className="flex items-center gap-1 border-b bg-muted/30 p-1.5"
                >
                    {tools.map(({
                        name,
                        label: toolLabel,
                        Icon,
                        command,
                    }) => (
                        <Button
                            key={name}
                            type="button"
                            size="icon"
                            variant={
                                active?.[name]
                                    ? 'secondary'
                                    : 'ghost'
                            }
                            className="size-8"
                            aria-label={toolLabel}
                            aria-pressed={active?.[name] ?? false}
                            title={toolLabel}
                            disabled={
                                disabled
                                || !editor
                                || linkOpen
                            }
                            onMouseDown={(event) => {
                                event.preventDefault()
                            }}
                            onClick={() => {
                                editor
                                    .chain()
                                    .focus()[command]()
                                    .run()
                            }}
                        >
                            <Icon className="size-4" />
                        </Button>
                    ))}

                    <Button
                        type="button"
                        size="icon"
                        variant={
                            active?.link ? 'secondary' : 'ghost'
                        }
                        className="size-8"
                        aria-label="Insert or edit link"
                        title="Insert or edit link"
                        aria-pressed={active?.link ?? false}
                        disabled={
                            disabled
                            || !editor
                            || linkOpen
                        }
                        onMouseDown={(event) => {
                            event.preventDefault()
                        }}
                        onClick={openLink}
                    >
                        <Link2 className="size-4" />
                    </Button>
                </div>

                {linkOpen && (
                    <div
                        role="group"
                        aria-label="Link settings"
                        className="space-y-3 border-b bg-muted/20 p-3"
                        onKeyDown={(event) => {
                            if (
                                event.key === 'Enter'
                                && !event.nativeEvent.isComposing
                            ) {
                                event.preventDefault()
                                event.stopPropagation()
                                saveLink()
                            }

                            if (event.key === 'Escape') {
                                event.preventDefault()
                                event.stopPropagation()
                                closeLink()
                            }
                        }}
                    >
                        <div className="grid gap-3 sm:grid-cols-2">
                            <label
                                htmlFor={`${linkId}-text`}
                                className="space-y-1 text-xs font-medium"
                            >
                                Link text

                                <Input
                                    id={`${linkId}-text`}
                                    value={linkText}
                                    disabled={disabled}
                                    onChange={(event) => {
                                        setLinkText(event.target.value)
                                    }}
                                    placeholder="e.g. Read the guide"
                                />
                            </label>

                            <label
                                htmlFor={`${linkId}-url`}
                                className="space-y-1 text-xs font-medium"
                            >
                                Link URL

                                <Input
                                    id={`${linkId}-url`}
                                    value={linkUrl}
                                    disabled={disabled}
                                    autoFocus
                                    inputMode="url"
                                    aria-invalid={Boolean(linkError)}
                                    aria-describedby={
                                        linkError
                                            ? `${linkId}-error`
                                            : undefined
                                    }
                                    onChange={(event) => {
                                        setLinkUrl(event.target.value)
                                        setLinkError('')
                                    }}
                                    placeholder="https://example.com"
                                />
                            </label>
                        </div>

                        {linkError && (
                            <p
                                id={`${linkId}-error`}
                                role="alert"
                                className="text-xs text-destructive"
                            >
                                {linkError}
                            </p>
                        )}

                        <div className="flex flex-wrap items-center justify-end gap-2">
                            {active?.link && (
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    disabled={disabled}
                                    onClick={removeLink}
                                    className="mr-auto"
                                >
                                    <Unlink className="size-4" />
                                    Remove link
                                </Button>
                            )}

                            <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                disabled={disabled}
                                onClick={closeLink}
                            >
                                Cancel link
                            </Button>

                            <Button
                                type="button"
                                size="sm"
                                disabled={disabled}
                                onClick={saveLink}
                            >
                                Apply link
                            </Button>
                        </div>
                    </div>
                )}

                <div className="relative">
                    {placeholder && active?.empty && (
                        <p aria-hidden="true" className="pointer-events-none absolute left-3 top-3 text-sm leading-6 text-muted-foreground">
                            {placeholder}
                        </p>
                    )}
                    <EditorContent editor={editor} />
                </div>
            </div>

            {!compact && (
                <p className="text-xs text-muted-foreground">
                    Select text to format it or add a link.
                    Pasted web addresses become clickable links.
                </p>
            )}
        </div>
    )
}