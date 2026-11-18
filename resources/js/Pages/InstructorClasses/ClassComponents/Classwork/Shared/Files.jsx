import React, {
    Suspense,
    lazy,
    useId,
    useRef,
    useState,
} from 'react'

import axios from 'axios'
import { toast } from 'sonner'

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
    X,
} from 'lucide-react'

import {
    Button,
    buttonVariants,
} from '@/Components/ui/button'

import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/Components/ui/alert-dialog'

import { cn } from '@/Lib/Utils'

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

function AttachmentIcon({ Icon, type, small = false }) {
    if (type === 'PDF') {
        return (
            <svg
                viewBox="0 0 32 40"
                className={cn('text-red-600 dark:text-red-500', small ? 'h-8 w-6' : 'h-10 w-8')}
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
            className={cn('text-muted-foreground', small ? 'size-6' : 'size-8')}
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
    // The section heading; null hides it (the list is then labelled
    // "Attached files" for screen readers).
    title = 'Attachments',
    // Adds a muted "(optional)" to the heading, as in the editor.
    optional = false,
    // Read-only lists can disappear when empty instead of saying so.
    hideEmpty = false,
    // Smaller rows, for the "Your work" panel.
    compact = false,
    // Shows a Remove button on each file (the server checks the rules).
    removable = false,
    // Student uploads follow the assignment's settings: `accept` filters the
    // picker, `checkFile` rejects a file before upload with a reason, and
    // `maxFiles` caps how many can be attached. The server checks them too.
    accept,
    checkFile,
    maxFiles,
    hint,
}) {
    const { base } = useClasswork()

    const query = useClassworkQuery(`${kind}/${id ?? 'pending'}/files`, {
        enabled: Boolean(id),
    })

    const [progress, setProgress] = useState('')
    const [failed, setFailed] = useState([])
    const [busy, setBusy] = useState(false)
    const [prepareError, setPrepareError] = useState(null)
    const [rejected, setRejected] = useState([])
    const [previewFile, setPreviewFile] = useState(null)
    // The file in the remove dialog stays set while it animates closed.
    const [removing, setRemoving] = useState(null)
    const [confirmOpen, setConfirmOpen] = useState(false)

    const inputRef = useRef(null)
    const headingId = useId()
    const Heading = `h${Math.min(6, Math.max(2, headingLevel))}`

    // Students remove files from their own work; teachers from what they post.
    const ownWork = kind === 'submissions'

    const remove = useClassworkMutation(
        (file, url) => axios.delete(`${url}/files/${file.id}`),
        (response, file) => {
            setConfirmOpen(false)
            setProgress('')
            toast.success('File removed', { description: file.name })

            if (!ownWork && response.data?.trashed === false) {
                toast.warning('The file could not be moved to the Google Drive trash.', {
                    description: 'Remove it from Google Drive manually if needed.',
                })
            }
        }
    )

    async function confirmRemove() {
        if (!confirmOpen || !removing || remove.isPending) return

        onBusyChange?.(true)

        try {
            await remove.mutateAsync(removing)
        } catch {
            // Shown in the dialog.
        } finally {
            onBusyChange?.(false)
        }
    }

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

    async function send(picked) {
        if (!picked.length || busy) return

        // Reject files that break the rules before sending anything.
        const problems = []
        const room = maxFiles ? Math.max(0, maxFiles - (query.data?.length ?? 0)) : Infinity
        const files = []

        for (const file of picked) {
            const problem = checkFile?.(file)
            if (problem) problems.push(problem)
            else if (files.length >= room) problems.push(`${file.name}: you can attach up to ${maxFiles} file${maxFiles === 1 ? '' : 's'}.`)
            else files.push(file)
        }

        setRejected(problems)

        if (!files.length) {
            setProgress('')
            return
        }

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

    const files = query.data ?? []
    const empty = Boolean(id) && query.isSuccess && files.length === 0

    // Read-only lists with nothing to show disappear entirely.
    if (hideEmpty && !editable && (!id || query.isPending || empty)) {
        return null
    }

    const iconButton = 'size-11 shrink-0'

    return (
        <section
            aria-labelledby={title ? headingId : undefined}
            aria-label={title ? undefined : 'Files'}
            className={cn('min-w-0', compact ? 'space-y-2' : 'space-y-3')}
        >
            {title && (
                <Heading
                    id={headingId}
                    className="flex items-center gap-3 text-lg font-semibold text-foreground"
                >
                    <Paperclip
                        className="size-5"
                        aria-hidden="true"
                    />
                    <span>
                        {title}
                        {optional && <span className="text-sm font-normal text-muted-foreground"> (optional)</span>}
                    </span>
                </Heading>
            )}

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

            {/* The compact panel says what to attach instead. */}
            {!compact && (!id || empty) && (
                <p className="rounded-lg border border-dashed border-border px-4 py-5 text-sm text-muted-foreground">
                    No files attached.
                </p>
            )}

            {files.length > 0 && (
                <ul
                    className="space-y-2"
                    aria-label="Attached files"
                >
                    {files.map((file) => {
                        const { Icon, type } = fileDetails(file)
                        const busyRemoving = remove.isPending && removing?.id === file.id

                        return (
                            // The whole row opens the preview: the name's button
                            // stretches over it, and the action buttons sit above.
                            <li
                                key={file.id}
                                className={cn(
                                    'relative flex min-w-0 items-center border border-border transition-colors',
                                    compact
                                        ? 'gap-3 rounded-lg bg-background py-2 pl-3 pr-1.5 hover:bg-muted/40'
                                        : 'gap-3 rounded-xl bg-card px-3 py-3 hover:bg-muted/20 sm:gap-5 sm:px-5'
                                )}
                            >
                                <span className={cn('flex shrink-0 items-center justify-center', compact ? 'size-8' : 'size-12')}>
                                    <AttachmentIcon
                                        Icon={Icon}
                                        type={type}
                                        small={compact}
                                    />
                                </span>

                                <div className="min-w-0 flex-1">
                                    <Button
                                        type="button"
                                        variant="link"
                                        onClick={() => setPreviewFile(file)}
                                        className={cn(
                                            'block h-auto max-w-full truncate rounded-sm p-0 text-left text-foreground underline-offset-4 hover:text-primary hover:underline',
                                            'after:absolute after:inset-0 focus-visible:ring-0 focus-visible:after:ring-2 focus-visible:after:ring-ring',
                                            compact ? 'text-sm font-medium after:rounded-lg' : 'text-sm font-semibold after:rounded-xl sm:text-base'
                                        )}
                                        aria-label={`Preview ${file.name}`}
                                        title={file.name}
                                    >
                                        {file.name}
                                    </Button>

                                    <p className={cn('mt-0.5 text-xs text-muted-foreground', !compact && 'sm:text-sm')}>
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
                                        variant: compact ? 'ghost' : 'secondary',
                                        size: 'icon',
                                        className: compact
                                            ? `${iconButton} relative z-10 text-muted-foreground hover:text-foreground`
                                            : 'relative z-10 h-11 w-11 shrink-0 border border-border text-foreground',
                                    })}
                                >
                                    <Download
                                        className={compact ? 'size-4' : 'size-5'}
                                        aria-hidden="true"
                                    />
                                </a>

                                {removable && (
                                    <Button
                                        type="button"
                                        variant={compact ? 'ghost' : 'secondary'}
                                        size="icon"
                                        disabled={busy || remove.isPending}
                                        onClick={() => {
                                            remove.reset()
                                            setRemoving(file)
                                            setConfirmOpen(true)
                                        }}
                                        aria-label={`Remove ${file.name}`}
                                        title={`Remove ${file.name}`}
                                        // While disabled it still takes the click, so the
                                        // row's preview underneath doesn't open instead.
                                        className={cn(
                                            'relative z-10 disabled:pointer-events-auto disabled:cursor-not-allowed',
                                            compact
                                                ? `${iconButton} text-muted-foreground hover:bg-destructive/10 hover:text-destructive`
                                                : 'h-11 w-11 shrink-0 border border-border text-foreground hover:bg-destructive/10 hover:text-destructive'
                                        )}
                                    >
                                        {busyRemoving
                                            ? <Loader2 className={compact ? 'size-4 animate-spin' : 'size-5 animate-spin'} aria-hidden="true" />
                                            : <X className={compact ? 'size-4' : 'size-5'} aria-hidden="true" />}
                                    </Button>
                                )}
                            </li>
                        )
                    })}
                </ul>
            )}

            {editable && (
                <div className="space-y-2">
                    <input
                        ref={inputRef}
                        type="file"
                        multiple={maxFiles !== 1}
                        accept={accept}
                        hidden
                        aria-label="Upload files"
                        disabled={busy}
                        onChange={(event) => {
                            const picked = Array.from(
                                event.target.files || []
                            )

                            event.target.value = ''
                            void send(picked)
                        }}
                    />

                    <div className={cn('flex flex-wrap items-center gap-x-5 gap-y-2', compact && 'flex-col items-stretch')}>
                        <Button
                            type="button"
                            variant="outline"
                            disabled={busy || remove.isPending}
                            onClick={() => inputRef.current?.click()}
                            className={cn(
                                'h-11 gap-2 rounded-lg border-primary bg-transparent px-4 text-primary shadow-none hover:bg-primary/10 hover:text-primary dark:border-primary dark:bg-transparent dark:hover:bg-primary/10',
                                compact && 'w-full'
                            )}
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

                            {busy ? 'Uploading…' : files.length > 0 ? 'Add more files' : 'Add files'}
                        </Button>

                        <p className="text-xs leading-5 text-muted-foreground sm:text-sm">
                            {hint ?? 'Any file type · Maximum 100 MB per file.'}
                            {!compact && ' Click a filename to preview supported documents and images.'}
                        </p>
                    </div>

                    {rejected.length > 0 && (
                        <ul role="alert" className="space-y-1 text-sm text-destructive">
                            {rejected.map((message) => <li key={message} className="break-words">{message}</li>)}
                        </ul>
                    )}

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

            {progress && (
                <p
                    role="status"
                    className="break-words text-xs text-muted-foreground"
                >
                    {progress}
                </p>
            )}

            <AlertDialog
                open={confirmOpen}
                onOpenChange={(open) => {
                    if (!open && !remove.isPending) setConfirmOpen(false)
                }}
            >
                <AlertDialogContent className="w-[calc(100%-2rem)] rounded-xl sm:w-full">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="break-words">
                            Remove “{removing?.name}”?
                        </AlertDialogTitle>

                        <AlertDialogDescription>
                            {ownWork
                                ? 'It’s taken out of your work. You can add it again before you turn it in.'
                                : 'Students won’t see it anymore. It goes to the Google Drive trash, where it can be recovered for 30 days.'}
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <ErrorNotice error={remove.error} />

                    <AlertDialogFooter>
                        <Button
                            variant="outline"
                            disabled={remove.isPending}
                            onClick={() => setConfirmOpen(false)}
                        >
                            Cancel
                        </Button>

                        <Button
                            variant="destructive"
                            disabled={remove.isPending}
                            onClick={() => void confirmRemove()}
                        >
                            {remove.isPending ? 'Removing…' : 'Remove'}
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

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
