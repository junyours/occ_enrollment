import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react'
import { CheckCircle2, FileText, FileImage, Loader2, Upload, X } from 'lucide-react'
import { Button } from '@/Components/ui/button'

const MAX_BYTES = 100 * 1024 * 1024

function fileSize(bytes) {
    return bytes < 1024 * 1024
        ? `${Math.max(1, Math.ceil(bytes / 1024))} KB`
        : `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

/**
 * Files picked to upload on save. `optional` adds a muted "(optional)" to
 * the heading. `compact` shows only the picked files, for forms with their
 * own Attach button: the ref's open() shows the file dialog and add(files)
 * takes dropped files.
 */
const AttachmentPicker = forwardRef(function AttachmentPicker(
    { files, onChange, disabled, optional = false, compact = false },
    ref
) {
    const input = useRef(null)
    const sequence = useRef(0)
    const [dragging, setDragging] = useState(false)
    const hasFiles = files.length > 0

    function addFiles(selected) {
        if (disabled) return

        const incoming = Array.from(selected).map((file) => ({
            id: `attachment-${++sequence.current}`,
            fingerprint: `${file.name}:${file.size}:${file.lastModified}`,
            file,
            status: file.size > MAX_BYTES ? 'invalid' : 'queued',
            progress: 0,
            error: file.size > MAX_BYTES ? 'Maximum file size is 100 MB. Remove this file to continue.' : '',
        }))

        onChange((current) => {
            const next = [...current]

            for (const entry of incoming) {
                if (!next.some((file) => file.fingerprint === entry.fingerprint)) next.push(entry)
            }

            return next
        })
    }

    useImperativeHandle(ref, () => ({
        open: () => {
            if (!disabled) input.current?.click()
        },
        add: addFiles,
    }))

    const fileInput = (
        <input ref={input} type="file" multiple className="sr-only" tabIndex={-1}
            aria-label="Choose attachments" disabled={disabled}
            onChange={(event) => { addFiles(event.target.files || []); event.target.value = '' }} />
    )

    const list = hasFiles && (
        <ul className="space-y-2" aria-label="Selected attachments">
            {files.map((entry) => {
                const Icon = entry.file.type.startsWith('image/') ? FileImage : FileText
                const saved = entry.status === 'uploaded'
                return (
                    <li key={entry.id} className={`flex min-w-0 items-start gap-3 rounded-lg border ${compact ? 'p-2.5' : 'p-3'}`}>
                        <div className={`rounded-md bg-muted text-primary ${compact ? 'p-1.5' : 'p-2'}`}><Icon className={compact ? 'size-4' : 'size-5'} /></div>
                        <div className="min-w-0 flex-1">
                            <p className="break-words text-sm font-medium">{entry.file.name}</p>
                            <p className="text-xs text-muted-foreground">
                                {fileSize(entry.file.size)} · {saved ? 'Uploaded' : entry.status === 'uploading'
                                    ? `${entry.progress}% sent${entry.progress === 100 ? ' · Saving to Drive…' : ''}`
                                    : entry.status === 'error' ? 'Upload not completed' : entry.status === 'invalid' ? 'Too large' : 'Ready to upload'}
                            </p>
                            {entry.status === 'uploading' && (
                                <progress className="mt-2 h-1.5 w-full accent-primary" value={entry.progress} max={100} aria-label={`Uploading ${entry.file.name}`} />
                            )}
                            {entry.error && <p role="alert" className="mt-1 text-xs text-destructive">{entry.error}</p>}
                        </div>
                        {saved ? <CheckCircle2 className="mt-1 size-4 shrink-0 text-emerald-600" aria-label="Uploaded" />
                            : entry.status === 'uploading' ? <Loader2 className="mt-1 size-4 shrink-0 animate-spin" />
                                : <Button type="button" variant="ghost" size="icon" disabled={disabled} className={compact ? 'size-8' : undefined}
                                    aria-label={`Remove ${entry.file.name}`} onClick={() => onChange((current) => current.filter((file) => file.id !== entry.id))}>
                                    <X className="size-4" />
                                </Button>}
                    </li>
                )
            })}
        </ul>
    )

    if (compact) {
        return (
            <>
                {fileInput}
                {list}
            </>
        )
    }

    return (
        <section className="space-y-3 rounded-xl border bg-background p-4" aria-label="Attachments">
            <div className="flex items-center justify-between gap-2">
                <div>
                    <h3 className="text-sm font-semibold">
                        Attachments
                        {optional && <span className="font-normal text-muted-foreground"> (optional)</span>}
                    </h3>
                    <p className="text-xs text-muted-foreground">PDF, DOCX, images and other files · Up to 100 MB each</p>
                </div>
                <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">{files.length} selected</span>
            </div>

            {fileInput}

            <div
                className={`rounded-lg border border-dashed ${hasFiles ? 'flex flex-wrap items-center justify-between gap-3 p-3 text-left' : 'p-5 text-center'} ${dragging ? 'border-primary bg-primary/5' : 'bg-muted/20'}`}
                onDragOver={(event) => { event.preventDefault(); if (!disabled) setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={(event) => { event.preventDefault(); setDragging(false); addFiles(event.dataTransfer.files) }}
            >
                <Button type="button" variant="outline" disabled={disabled} onClick={() => input.current?.click()}>
                    <Upload className="size-4" /> {hasFiles ? 'Add more files' : 'Add files'}
                </Button>
                <div className={`text-xs text-muted-foreground ${hasFiles ? '' : 'mt-2 space-y-1'}`}>
                    {!hasFiles && <p>Choose files or drag them here.</p>}
                    <p>Files upload when you save or post.</p>
                </div>
            </div>

            {list}
        </section>
    )
})

export default AttachmentPicker
