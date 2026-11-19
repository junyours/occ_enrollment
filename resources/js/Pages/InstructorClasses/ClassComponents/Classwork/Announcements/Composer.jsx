import React, { useEffect, useId, useRef, useState } from 'react'
import axios from 'axios'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { CalendarClock, ChevronDown, FileText, Loader2, Paperclip, Send, Users } from 'lucide-react'

import { Button } from '@/Components/ui/button'
import { Checkbox } from '@/Components/ui/checkbox'
import { Input } from '@/Components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/Components/ui/popover'
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/Components/ui/dropdown-menu'
import {
    AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
    AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/Components/ui/alert-dialog'
import { cn } from '@/Lib/Utils'

import AttachmentPicker from '../Shared/AttachmentPicker'
import Files from '../Shared/Files'
import RichTextEditor from '../Shared/RichTextEditor'
import { ErrorNotice, errorMessage, formatDateTime, localDateInput, useClasswork, useClassworkQuery } from '../Shared/api'
import { toEditorHtml } from '../Shared/richText'
import { hasText } from './format'

// Tomorrow at 7:00 AM, a sensible first suggestion for a scheduled post.
function defaultScheduleTime() {
    const date = new Date()
    date.setDate(date.getDate() + 1)
    date.setHours(7, 0, 0, 0)
    return localDateInput(date.toISOString())
}

/** Other classes the teacher teaches this school year, to post copies to. */
function OtherClasses({ targets, selected, onChange, disabled }) {
    const count = selected.length

    function toggle(id, checked) {
        onChange((current) => checked ? [...current, id] : current.filter((value) => value !== id))
    }

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button type="button" variant="ghost" size="sm" disabled={disabled}
                    className={cn('h-9 gap-1.5 px-2.5', count > 0 ? 'text-primary' : 'text-muted-foreground')}>
                    <Users className="size-4" aria-hidden="true" />
                    {count > 0 ? `+${count} class${count === 1 ? '' : 'es'}` : 'Other classes'}
                </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-[min(20rem,calc(100vw-2rem))] p-0">
                <div className="border-b px-3 py-2.5">
                    <p className="text-sm font-medium">Also post to</p>
                    <p className="text-xs text-muted-foreground">Each class gets its own copy, files included.</p>
                </div>
                <ul className="max-h-64 overflow-y-auto p-1" aria-label="Your other classes">
                    {targets.map((target) => (
                        <li key={target.id}>
                            <label className="flex cursor-pointer items-start gap-2.5 rounded-md px-2 py-2 hover:bg-muted">
                                <Checkbox
                                    className="mt-0.5"
                                    checked={selected.includes(target.id)}
                                    onCheckedChange={(checked) => toggle(target.id, checked === true)}
                                />
                                <span className="min-w-0 text-sm">
                                    <span className="font-medium">{target.subject}</span>
                                    <span className="text-muted-foreground"> · {target.section}</span>
                                    <span className="block truncate text-xs text-muted-foreground">{target.title}</span>
                                </span>
                            </label>
                        </li>
                    ))}
                </ul>
            </PopoverContent>
        </Popover>
    )
}

/**
 * Writes a new announcement, or edits `post`. It can post now, schedule a
 * time, or save a draft, and send copies to the teacher's other classes. A
 * post with new files waits as a draft until every file is uploaded, so
 * students never see it half-attached; if an upload fails, trying again
 * picks up where it stopped.
 */
export default function Composer({ post = null, onDone, onCancel }) {
    const { base, key } = useClasswork()
    const client = useQueryClient()
    const scheduleId = useId()
    const editing = Boolean(post)
    const posted = Boolean(post?.published)

    const initialBody = useRef(post ? toEditorHtml(post.body, 'html') : '')
    const [body, setBody] = useState(initialBody.current)
    const [attachments, setAttachments] = useState([])
    const [intent, setIntent] = useState(post?.scheduled_at ? 'schedule' : 'post')
    const [scheduleAt, setScheduleAt] = useState(post?.scheduled_at ? localDateInput(post.scheduled_at) : '')
    const [selected, setSelected] = useState([])
    const [stage, setStage] = useState('')
    const [dragging, setDragging] = useState(false)
    const [removingFile, setRemovingFile] = useState(false)
    const [confirmDiscard, setConfirmDiscard] = useState(false)

    const picker = useRef(null)
    const savedId = useRef(post?.id ?? null)
    const completedUploads = useRef(new Set())
    const saving = useRef(false)

    const targets = useClassworkQuery('announcements/targets', {
        enabled: !posted,
        staleTime: 5 * 60_000,
    }).data ?? []

    function updateAttachment(id, changes) {
        setAttachments((current) => current.map((entry) => entry.id === id ? { ...entry, ...changes } : entry))
    }

    const save = useMutation({
        retry: false,
        networkMode: 'always',
        mutationFn: async ({ html, files, action, scheduledAt, also }) => {
            if (!navigator.onLine) {
                throw new Error('You are offline. Your announcement is still here; reconnect and try again.')
            }

            const pending = files.filter((entry) => !completedUploads.current.has(entry.id))
            const working = { post: 'Posting…', schedule: 'Scheduling…', draft: 'Saving draft…' }[action]
            const state = action === 'post'
                ? { published: true }
                : { scheduled_at: action === 'schedule' ? scheduledAt : null }
            const copies = action !== 'draft' && also.length ? { also_class_ids: also } : {}

            if (!savedId.current) {
                // Without new files it is saved in one step.
                if (!pending.length) {
                    setStage(working)
                    const response = await axios.post(`${base}/announcements`, {
                        body: html,
                        published: action === 'post',
                        scheduled_at: action === 'schedule' ? scheduledAt : null,
                        ...copies,
                    })
                    savedId.current = response.data.id
                    return { id: response.data.id, action, copies: response.data.copies?.length ?? 0 }
                }

                setStage('Saving…')
                const response = await axios.post(`${base}/announcements`, { body: html, published: false })
                savedId.current = response.data.id
            }

            const id = savedId.current

            for (const [index, entry] of pending.entries()) {
                setStage(`Uploading ${index + 1} of ${pending.length}: ${entry.file.name}`)
                updateAttachment(entry.id, { status: 'uploading', progress: 0, error: '' })

                const form = new FormData()
                form.append('file', entry.file)

                try {
                    await axios.post(`${base}/announcements/${id}/files`, form, {
                        onUploadProgress: ({ loaded, total }) => updateAttachment(entry.id, {
                            progress: total ? Math.min(100, Math.round(loaded / total * 100)) : 0,
                        }),
                    })

                    completedUploads.current.add(entry.id)
                    updateAttachment(entry.id, { status: 'uploaded', progress: 100 })
                } catch (error) {
                    updateAttachment(entry.id, { status: 'error', error: errorMessage(error) })
                    throw error
                }
            }

            setStage(posted ? 'Saving…' : working)
            const response = await axios.patch(
                `${base}/announcements/${id}`,
                posted ? { body: html } : { body: html, ...state, ...copies }
            )

            return { id, action, copies: response.data.copies?.length ?? 0 }
        },
        onSuccess: async ({ id, action, copies }, { scheduledAt }) => {
            await client.invalidateQueries({ queryKey: key })

            const classes = `${copies} other class${copies === 1 ? '' : 'es'}`
            const also = copies
                ? action === 'schedule' ? `Also scheduled in ${classes}.` : `Also posted to ${classes}.`
                : undefined

            if (posted) toast.success('Announcement updated')
            else if (action === 'post') toast.success('Announcement posted', { description: also })
            else if (action === 'schedule') toast.success(`Scheduled for ${formatDateTime(scheduledAt)}`, { description: also })
            else toast.success('Draft saved', { description: 'Only you can see it until you post it.' })

            onDone?.(id, action)
        },
        onError: () => {
            setStage('')
            // A draft saved before the failure appears in the feed.
            void client.invalidateQueries({ queryKey: key })
        },
        onSettled: () => {
            saving.current = false
        },
    })

    useEffect(() => {
        if (!save.isPending) return undefined

        const preventRefresh = (event) => {
            event.preventDefault()
            event.returnValue = ''
        }

        window.addEventListener('beforeunload', preventRefresh)
        return () => window.removeEventListener('beforeunload', preventRefresh)
    }, [save.isPending])

    const disabled = save.isPending
    const scheduleTime = scheduleAt ? new Date(scheduleAt) : null
    const badSchedule = intent === 'schedule'
        && (!scheduleTime || Number.isNaN(scheduleTime.getTime()) || scheduleTime.getTime() <= Date.now() + 60_000)

    const blockedReason = !hasText(body)
        ? 'Write something to announce.'
        : attachments.some((entry) => entry.status === 'invalid')
            ? 'Remove the files that can’t be uploaded.'
            : ''

    function submitAs(action) {
        if (saving.current || blockedReason || removingFile) return
        if (action === 'schedule' && badSchedule) return

        saving.current = true
        save.mutate({
            html: body,
            files: [...attachments],
            action,
            scheduledAt: action === 'schedule' ? scheduleTime.toISOString() : null,
            also: selected,
        })
    }

    function cancel() {
        if (disabled) return

        const changed = body !== initialBody.current
            || attachments.some((entry) => entry.status !== 'uploaded')

        if (changed) setConfirmDiscard(true)
        else onCancel?.()
    }

    function chooseSchedule() {
        if (!scheduleAt) setScheduleAt(defaultScheduleTime())
        setIntent('schedule')
    }

    const primaryLabel = posted ? 'Save' : intent === 'schedule' ? 'Schedule' : 'Post'
    const PrimaryIcon = intent === 'schedule' && !posted ? CalendarClock : Send
    const existingFiles = post?.files ?? []
    const anyFiles = existingFiles.length > 0 || attachments.length > 0

    return (
        <form
            onSubmit={(event) => {
                event.preventDefault()
                submitAs(posted ? 'post' : intent)
            }}
            onDragOver={(event) => {
                if (!disabled && event.dataTransfer?.types?.includes('Files')) {
                    event.preventDefault()
                    setDragging(true)
                }
            }}
            onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false)
            }}
            onDrop={(event) => {
                if (!event.dataTransfer?.files?.length) return
                event.preventDefault()
                setDragging(false)
                picker.current?.add(event.dataTransfer.files)
            }}
            className={cn('min-w-0 space-y-3 rounded-lg transition-shadow', dragging && 'ring-2 ring-primary ring-offset-4 ring-offset-card')}
            aria-label={editing ? 'Edit announcement' : 'New announcement'}
        >
            <RichTextEditor
                label="Announcement"
                placeholder="Announce something to your class…"
                value={body}
                onChange={setBody}
                disabled={disabled}
                compact
                autoFocus
            />

            {anyFiles && (
                <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Attachments</p>
                    {existingFiles.length > 0 && (
                        <Files
                            kind="announcements"
                            id={post.id}
                            preloaded={existingFiles}
                            title={null}
                            compact
                            removable={!disabled}
                            onBusyChange={setRemovingFile}
                        />
                    )}
                </div>
            )}

            {/* Always mounted: it holds the file input the Attach button opens. */}
            <AttachmentPicker ref={picker} compact files={attachments} onChange={setAttachments} disabled={disabled} />

            {intent === 'schedule' && !posted && (
                <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
                    <CalendarClock className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <label htmlFor={scheduleId} className="text-sm">Post on</label>
                    <Input
                        id={scheduleId}
                        type="datetime-local"
                        value={scheduleAt}
                        min={localDateInput(new Date(Date.now() + 5 * 60_000).toISOString())}
                        onChange={(event) => setScheduleAt(event.target.value)}
                        disabled={disabled}
                        aria-invalid={badSchedule}
                        className="h-9 w-auto min-w-[13.5rem] flex-1 sm:flex-none"
                    />
                    <Button type="button" variant="ghost" size="sm" className="h-9" disabled={disabled} onClick={() => setIntent('post')}>
                        Don’t schedule
                    </Button>
                    {badSchedule && scheduleAt && (
                        <p className="w-full text-xs text-destructive">Pick a time at least a minute from now.</p>
                    )}
                </div>
            )}

            {disabled && stage && (
                <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    {stage}
                </p>
            )}

            {save.isError && (
                <div className="space-y-1">
                    <ErrorNotice error={save.error} />
                    {!editing && savedId.current && (
                        <p className="text-sm text-muted-foreground">
                            It’s saved as a draft that students can’t see. Try again to finish.
                        </p>
                    )}
                </div>
            )}

            <div className="flex flex-wrap items-center gap-x-2 gap-y-3">
                <div className="flex items-center gap-1">
                    <Button type="button" variant="ghost" size="sm" className="h-9 gap-1.5 px-2.5 text-muted-foreground"
                        disabled={disabled} onClick={() => picker.current?.open()}>
                        <Paperclip className="size-4" aria-hidden="true" />
                        Attach
                    </Button>

                    {!posted && targets.length > 0 && (
                        <OtherClasses targets={targets} selected={selected} onChange={setSelected} disabled={disabled} />
                    )}
                </div>

                <div className="ml-auto flex items-center gap-2">
                    {blockedReason && !disabled && (
                        <span className="hidden text-xs text-muted-foreground sm:inline">{blockedReason}</span>
                    )}

                    <Button type="button" variant="outline" onClick={cancel} disabled={disabled}>
                        Cancel
                    </Button>

                    <div className="flex">
                        <Button type="submit"
                            disabled={disabled || Boolean(blockedReason) || removingFile || (intent === 'schedule' && !posted && badSchedule)}
                            className={cn('gap-2', !posted && 'rounded-r-none')}>
                            {disabled
                                ? <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                                : <PrimaryIcon className="size-4" aria-hidden="true" />}
                            {primaryLabel}
                        </Button>

                        {!posted && (
                            <DropdownMenu modal={false}>
                                <DropdownMenuTrigger asChild>
                                    <Button type="button" disabled={disabled} aria-label="More ways to post"
                                        className="rounded-l-none border-l border-primary-foreground/25 px-2">
                                        <ChevronDown className="size-4" aria-hidden="true" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-44">
                                    {intent !== 'post' && (
                                        <DropdownMenuItem disabled={Boolean(blockedReason)} onSelect={() => submitAs('post')}>
                                            <Send className="size-4" aria-hidden="true" /> Post now
                                        </DropdownMenuItem>
                                    )}
                                    {intent !== 'schedule' && (
                                        <DropdownMenuItem onSelect={chooseSchedule}>
                                            <CalendarClock className="size-4" aria-hidden="true" /> Schedule…
                                        </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem disabled={Boolean(blockedReason)} onSelect={() => submitAs('draft')}>
                                        <FileText className="size-4" aria-hidden="true" /> Save draft
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                </div>
            </div>

            <AlertDialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
                <AlertDialogContent className="w-[calc(100%-2rem)] rounded-xl sm:w-full">
                    <AlertDialogHeader>
                        <AlertDialogTitle>{editing ? 'Discard your changes?' : 'Discard this announcement?'}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {editing
                                ? 'The announcement stays as it was.'
                                : savedId.current
                                    ? 'It stays in the feed as a draft, without the files that didn’t upload.'
                                    : 'What you wrote won’t be saved.'}
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <AlertDialogFooter>
                        <AlertDialogCancel type="button">Keep writing</AlertDialogCancel>
                        <Button type="button" variant="destructive" onClick={() => {
                            setConfirmDiscard(false)
                            onCancel?.()
                        }}>
                            Discard
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </form>
    )
}
