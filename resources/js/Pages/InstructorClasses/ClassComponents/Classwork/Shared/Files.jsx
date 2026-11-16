import React, {
    Suspense,
    lazy,
    useId,
    useRef,
    useState,
} from 'react'

import axios from 'axios'

import {
    Download,
    File,
    FileArchive,
    FileAudio,
    FileCode,
    FileImage,
    FileSpreadsheet,
    FileText,
    FileVideo,
    Loader2,
    Paperclip,
    Plus,
} from 'lucide-react'

import {
    Button,
    buttonVariants,
} from '@/Components/ui/button'

import {
    ErrorNotice,
    useClasswork,
    useClassworkMutation,
    useClassworkQuery,
} from './api'

// The viewer is loaded only when a file is opened.
const FilePreview = lazy(() => import('./FilePreview'))

function fileDetails(file) {
    const name = String(file.name || '')

    const extension = name.includes('.')
        ? name.split('.').pop().toLowerCase()
        : ''

    const mime = String(file.mime_type || '').toLowerCase()

    const type = extension && extension.length <= 10
        ? extension.toUpperCase()
        : 'File'

    if (
        mime.startsWith('image/')
        || /^(png|jpe?g|gif|webp|svg|heic)$/.test(extension)
    ) {
        return { Icon: FileImage, type }
    }

    if (
        mime.startsWith('audio/')
        || /^(mp3|wav|m4a|ogg)$/.test(extension)
    ) {
        return { Icon: FileAudio, type }
    }

    if (
        mime.startsWith('video/')
        || /^(mp4|mov|avi|webm)$/.test(extension)
    ) {
        return { Icon: FileVideo, type }
    }

    if (/^(zip|rar|7z|gz|tar)$/.test(extension)) {
        return { Icon: FileArchive, type }
    }

    if (/^(xlsx?|csv|ods)$/.test(extension)) {
        return { Icon: FileSpreadsheet, type }
    }

    if (/^(js|jsx|ts|tsx|php|html|css|json|py)$/.test(extension)) {
        return { Icon: FileCode, type }
    }

    if (
        mime === 'application/pdf'
        || mime.startsWith('text/')
        || /^(pdf|docx?|txt|rtf|odt|pptx?)$/.test(extension)
    ) {
        return {
            Icon: FileText,
            type: mime === 'application/pdf' ? 'PDF' : type,
        }
    }

    return { Icon: File, type }
}

function formatFileSize(value) {
    const bytes = Number(value)

    if (
        value == null
        || value === ''
        || !Number.isFinite(bytes)
        || bytes < 0
    ) {
        return 'Size unavailable'
    }

    if (bytes < 1024) {
        return `${bytes} B`
    }

    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(1)} KB`
    }

    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function AttachmentIcon({ Icon, type }) {
    if (type === 'PDF') {
        return (
            <svg
                viewBox="0 0 32 40"
                className="h-10 w-8 text-red-600 dark:text-red-500"
                fill="none"
                aria-hidden="true"
            >
                <path
                    d="M4 0h17l11 11v25a4 4 0 0 1-4 4H4a4 4 0 0 1-4-4V4a4 4 0 0 1 4-4Z"
                    fill="currentColor"
                />

                <path
                    d="M21 0v8a3 3 0 0 0 3 3h8L21 0Z"
                    fill="white"
                    fillOpacity=".25"
                />

                <text
                    x="16"
                    y="31"
                    textAnchor="middle"
                    fill="white"
                    fontSize="11"
                    fontWeight="700"
                    fontFamily="Arial, sans-serif"
                >
                    PDF
                </text>
            </svg>
        )
    }

    return (
        <Icon
            className="size-8 text-muted-foreground"
            aria-hidden="true"
        />
    )
}

export default function Files({
    kind,
    id,
    editable = false,
    onBusyChange,
    // Called before the first upload when `id` does not exist yet (a
    // student's draft is created on demand). Resolves to the new id.
    ensureId,
    headingLevel = 3,
}) {
    const { base } = useClasswork()

    const query = useClassworkQuery(`${kind}/${id ?? 'pending'}/files`, {
        enabled: Boolean(id),
    })

    const [progress, setProgress] = useState('')
    const [failed, setFailed] = useState([])
    const [busy, setBusy] = useState(false)
    const [prepareError, setPrepareError] = useState(null)
    const [previewFile, setPreviewFile] = useState(null)

    const inputRef = useRef(null)
    const headingId = useId()
    const Heading = `h${Math.min(6, Math.max(2, headingLevel))}`

    const upload = useClassworkMutation(async ({ file, target }, url) => {
        const body = new FormData()
        body.append('file', file)

        return axios.post(`${url}/${target}`, body, {
            onUploadProgress: ({ loaded, total }) => {
                const message = total
                    ? `${Math.round(loaded / total * 100)}% sent — saving…`
                    : 'uploading…'

                setProgress(`${file.name}: ${message}`)
            },
        })
    })

    async function send(files) {
        if (!files.length || busy) return

        setBusy(true)
        onBusyChange?.(true)
        setPrepareError(null)

        const failures = []

        try {
            let targetId = id

            if (!targetId && ensureId) {
                try {
                    targetId = await ensureId()
                } catch (error) {
                    setPrepareError(error)
                    setFailed(files)
                    setProgress('')
                    return
                }
            }

            if (!targetId) return

            const target = `${kind}/${targetId}/files`

            for (const file of files) {
                try {
                    await upload.mutateAsync({ file, target })
                } catch {
                    failures.push(file)
                }
            }

            setFailed(failures)

            setProgress(
                failures.length
                    ? `${failures.length} file(s) were not confirmed saved. Check the list before retrying.`
                    : 'Files saved to Google Drive.'
            )
        } finally {
            setBusy(false)
            onBusyChange?.(false)
        }
    }

    return (
        <section
            aria-labelledby={headingId}
            className="min-w-0 space-y-3"
        >
            <Heading
                id={headingId}
                className="flex items-center gap-3 text-lg font-semibold text-foreground"
            >
                <Paperclip
                    className="size-5"
                    aria-hidden="true"
                />
                Attachments
            </Heading>

            {id && query.isPending && (
                <p role="status" className="text-sm text-muted-foreground">
                    Loading files…
                </p>
            )}

            <ErrorNotice error={query.error} />

            {query.isError && (
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => query.refetch()}
                >
                    Retry
                </Button>
            )}

            {(!id || query.data?.length === 0) && (
                <p className="rounded-lg border border-dashed border-border px-4 py-5 text-sm text-muted-foreground">
                    No files attached.
                </p>
            )}

            <ul
                className="space-y-2"
                aria-label="Attached files"
            >
                {query.data?.map((file) => {
                    const { Icon, type } = fileDetails(file)

                    return (
                        <li
                            key={file.id}
                            className="flex min-w-0 items-center gap-3 rounded-xl border border-border bg-card px-3 py-3 transition-colors hover:bg-muted/20 sm:gap-5 sm:px-5"
                        >
                            <span className="flex size-12 shrink-0 items-center justify-center">
                                <AttachmentIcon
                                    Icon={Icon}
                                    type={type}
                                />
                            </span>

                            <div className="min-w-0 flex-1">
                                <Button
                                    type="button"
                                    variant="link"
                                    onClick={() => setPreviewFile(file)}
                                    className="block h-auto max-w-full truncate rounded-sm p-0 text-left text-sm font-semibold text-foreground underline-offset-4 hover:text-primary hover:underline sm:text-base"
                                    aria-label={`Preview ${file.name}`}
                                    title={file.name}
                                >
                                    {file.name}
                                </Button>

                                <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
                                    {type}
                                    {' · '}
                                    {formatFileSize(file.size)}
                                </p>
                            </div>

                            <a
                                href={`${base}/files/${file.id}`}
                                aria-label={`Download ${file.name}`}
                                title={`Download ${file.name}`}
                                className={buttonVariants({
                                    variant: 'secondary',
                                    size: 'icon',
                                    className: 'h-11 w-11 shrink-0 border border-border text-foreground',
                                })}
                            >
                                <Download
                                    className="size-5"
                                    aria-hidden="true"
                                />
                            </a>
                        </li>
                    )
                })}
            </ul>

            {editable && (
                <div className="space-y-2">
                    <input
                        ref={inputRef}
                        type="file"
                        multiple
                        hidden
                        aria-label="Upload files"
                        disabled={busy}
                        onChange={(event) => {
                            const files = Array.from(
                                event.target.files || []
                            )

                            event.target.value = ''
                            void send(files)
                        }}
                    />

                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                        <Button
                            type="button"
                            variant="outline"
                            disabled={busy}
                            onClick={() => inputRef.current?.click()}
                            className="h-11 gap-2 rounded-lg border-primary bg-transparent px-4 text-primary shadow-none hover:bg-primary/10 hover:text-primary dark:border-primary dark:bg-transparent dark:hover:bg-primary/10"
                        >
                            {busy ? (
                                <Loader2
                                    className="size-5 animate-spin"
                                    aria-hidden="true"
                                />
                            ) : (
                                <Plus
                                    className="size-5"
                                    aria-hidden="true"
                                />
                            )}

                            {busy ? 'Uploading…' : 'Add files'}
                        </Button>

                        <p className="text-xs leading-5 text-muted-foreground sm:text-sm">
                            Any file type · Maximum 100 MB per file.
                            Click a filename to preview supported
                            documents and images.
                        </p>
                    </div>

                    {failed.length > 0 && (
                        <>
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={busy}
                                onClick={() => send(failed)}
                            >
                                Retry unsuccessful files
                            </Button>

                            <p className="break-words text-xs text-destructive">
                                {failed.map((file) => file.name).join(', ')}
                            </p>
                        </>
                    )}

                    {upload.isPaused && (
                        <p className="text-sm text-muted-foreground">
                            Waiting for internet. Keep this page open
                            to finish uploading.
                        </p>
                    )}

                    <ErrorNotice error={prepareError || upload.error} />
                </div>
            )}

            <p
                role="status"
                className="break-words text-xs text-muted-foreground"
            >
                {progress}
            </p>

            {previewFile && (
                <Suspense fallback={null}>
                    <FilePreview
                        key={previewFile.id}
                        file={previewFile}
                        onClose={() => setPreviewFile(null)}
                    />
                </Suspense>
            )}
        </section>
    )
}