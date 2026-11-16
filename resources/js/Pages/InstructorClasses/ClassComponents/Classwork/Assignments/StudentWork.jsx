import React, { useCallback, useEffect, useId, useRef, useState } from 'react'
import axios from 'axios'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Check, CloudOff, Loader2, TriangleAlert } from 'lucide-react'

import { Button } from '@/Components/ui/button'
import { Textarea } from '@/Components/ui/textarea'

import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/Components/ui/alert-dialog'

import Files from '../Shared/Files'
import StatusBadge from '../Shared/StatusBadge'

import {
    ErrorNotice,
    errorMessage,
    formatDateTime,
    formatTime,
    isLate,
    isPastDue,
    useClasswork,
    useClassworkMutation,
    useClassworkQuery,
} from '../Shared/api'

const AUTOSAVE_DELAY = 1000

// A copy of unsaved typing stays on this device until the server has it,
// so a refresh, a closed tab or a lost connection never loses work.
function readBackup(storageKey) {
    try {
        const value = JSON.parse(window.localStorage.getItem(storageKey) ?? 'null')
        return typeof value?.answer === 'string' ? value.answer : null
    } catch {
        return null
    }
}

function writeBackup(storageKey, answer) {
    try {
        window.localStorage.setItem(storageKey, JSON.stringify({ answer, at: Date.now() }))
    } catch {
        // Storage can be full or blocked; autosave still runs.
    }
}

function clearBackup(storageKey) {
    try {
        window.localStorage.removeItem(storageKey)
    } catch {
        // Nothing to clear.
    }
}

function Result({ score, max, feedback }) {
    const graded = score !== null && score !== undefined

    return (
        <div className="space-y-3">
            {graded ? (
                <div className="flex items-baseline justify-between gap-3 rounded-xl border border-border bg-card p-4">
                    <p className="text-sm font-medium text-muted-foreground">Score</p>
                    <p className="text-2xl font-semibold tabular-nums text-foreground">
                        {score}
                        <span className="text-base font-normal text-muted-foreground"> / {max}</span>
                    </p>
                </div>
            ) : (
                <p className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
                    Not graded yet. Your score will appear here.
                </p>
            )}

            {feedback && (
                <div className="space-y-1 rounded-xl border border-border bg-card p-4">
                    <p className="text-sm font-medium text-foreground">Feedback from your instructor</p>
                    <p className="whitespace-pre-wrap break-words text-sm">{feedback}</p>
                </div>
            )}
        </div>
    )
}

function Answer({ value }) {
    if (!value) return null

    return (
        <div className="space-y-1.5">
            <p className="text-sm font-medium">Your answer</p>
            <p className="whitespace-pre-wrap break-words rounded-lg border border-border bg-muted/30 p-3 text-sm">
                {value}
            </p>
        </div>
    )
}

function TurnedIn({ assignment, submission, score }) {
    const late = isLate(submission.submitted_at, assignment.due_at)

    return (
        <div className="space-y-4">
            <StatusBadge tone={late ? 'warning' : 'info'}>
                {late ? 'Turned in late' : 'Turned in'} · {formatDateTime(submission.submitted_at)}
            </StatusBadge>
            <Answer value={submission.answer} />
            <Files kind="submissions" id={submission.id} headingLevel={6} />
            <Result score={score} max={assignment.max_score} feedback={submission.feedback} />
        </div>
    )
}

function Closed({ assignment, submission, score }) {
    return (
        <div className="space-y-4">
            <div role="note" className="flex gap-2 rounded-lg border border-destructive/25 bg-destructive/5 p-3 text-sm">
                <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
                <p>
                    This assignment closed {formatDateTime(assignment.due_at)} and no longer
                    accepts work. Ask your instructor if you still need to turn it in.
                </p>
            </div>
            <Answer value={submission?.answer} />
            {submission && <Files kind="submissions" id={submission.id} headingLevel={6} />}
            <Result score={score} max={assignment.max_score} feedback={submission?.feedback} />
        </div>
    )
}

function SaveStatus({ state, onRetry }) {
    const base = 'flex flex-wrap items-center gap-1.5 text-xs'

    switch (state.status) {
        case 'dirty':
        case 'saving':
            return (
                <span className={`${base} text-muted-foreground`}>
                    <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                    Saving…
                </span>
            )
        case 'saved':
            return (
                <span className={`${base} text-muted-foreground`}>
                    <Check className="size-3.5" aria-hidden="true" />
                    {state.at ? `Draft saved · ${formatTime(state.at)}` : 'Draft saved'}
                </span>
            )
        case 'offline':
            return (
                <span className={`${base} text-amber-700 dark:text-amber-300`}>
                    <CloudOff className="size-3.5" aria-hidden="true" />
                    You're offline. Your answer is kept on this device and saves when you reconnect.
                </span>
            )
        case 'error':
            return (
                <span className={`${base} text-destructive`}>
                    <TriangleAlert className="size-3.5" aria-hidden="true" />
                    Couldn't save: {errorMessage(state.error)}
                    <Button type="button" variant="link" size="sm" className="h-auto p-0 text-xs" onClick={onRetry}>
                        Try again
                    </Button>
                </span>
            )
        default:
            return (
                <span className={`${base} text-muted-foreground`}>
                    Your answer saves automatically as you type.
                </span>
            )
    }
}

function Draft({ assignment, submission }) {
    const { base, key } = useClasswork()
    const client = useQueryClient()

    const mineKey = [...key, `assignments/${assignment.id}/mine`]
    const storageKey = `classwork-draft:${key.slice(1).join(':')}:${assignment.id}`
    const serverAnswer = submission?.answer ?? ''

    const [restored] = useState(() => {
        const backup = readBackup(storageKey)
        return backup !== null && backup !== serverAnswer ? backup : null
    })

    const [answer, setAnswer] = useState(restored ?? serverAnswer)
    const [showRestored, setShowRestored] = useState(restored !== null)
    const [state, setState] = useState(() =>
        restored !== null ? { status: 'dirty' } : { status: submission ? 'saved' : 'idle' }
    )
    const [uploading, setUploading] = useState(false)
    const [confirm, setConfirm] = useState(false)

    const answerId = useId()
    const statusId = useId()

    const latest = useRef(answer)
    const saved = useRef(serverAnswer)
    const submissionRef = useRef(submission)
    const chain = useRef(Promise.resolve())
    const timer = useRef(null)
    const submittedRef = useRef(false)

    submissionRef.current = submission ?? submissionRef.current

    const files = useClassworkQuery(`submissions/${submission?.id ?? 'pending'}/files`, {
        enabled: Boolean(submission?.id),
    })
    const fileCount = files.data?.length ?? 0

    // Requests are queued so autosaves and draft creation never race.
    const post = useCallback((value) => {
        const run = chain.current.then(() =>
            axios.post(`${base}/assignments/${assignment.id}/draft`, { answer: value })
        )
        chain.current = run.catch(() => {})
        return run
    }, [base, assignment.id])

    const remember = useCallback((row) => {
        const first = !submissionRef.current
        submissionRef.current = row
        client.setQueryData(mineKey, (current) => ({ score: null, ...(current ?? {}), submission: row }))

        // The list shows "In progress" once a draft exists.
        if (first) {
            void client.invalidateQueries({ queryKey: [...key, 'assignments'], exact: true })
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [client, key.join(':'), assignment.id])

    const saveNow = useCallback(async (value) => {
        const { data } = await post(value)
        saved.current = value
        remember(data)

        if (latest.current === value) {
            clearBackup(storageKey)
            setState({ status: 'saved', at: new Date() })
        }

        return data
    }, [post, remember, storageKey])

    const flush = useCallback(async () => {
        window.clearTimeout(timer.current)

        if (submittedRef.current) return

        const value = latest.current

        if (value === saved.current) {
            setState((current) => {
                if (!submissionRef.current) return { status: 'idle' }
                return current.status === 'saved' ? current : { status: 'saved', at: current.at }
            })
            return
        }

        if (!navigator.onLine) {
            setState({ status: 'offline' })
            return
        }

        setState((current) => ({ status: 'saving', at: current.at }))

        try {
            await saveNow(value)
        } catch (error) {
            setState(navigator.onLine ? { status: 'error', error } : { status: 'offline' })
        }
    }, [saveNow])

    // Uploading a file before typing creates the draft first.
    const ensureId = useCallback(async () => {
        if (submissionRef.current?.id) return submissionRef.current.id
        const data = await saveNow(latest.current)
        return data.id
    }, [saveNow])

    function change(value) {
        setAnswer(value)
        latest.current = value
        writeBackup(storageKey, value)
        setState((current) => ({ status: 'dirty', at: current.at }))
        window.clearTimeout(timer.current)
        timer.current = window.setTimeout(flush, AUTOSAVE_DELAY)
    }

    function revertToSaved() {
        setShowRestored(false)
        change(serverAnswer)
        clearBackup(storageKey)
    }

    // Sync a restored device copy, retry when the connection returns,
    // and save when the student switches apps or tabs.
    useEffect(() => {
        if (restored !== null) timer.current = window.setTimeout(flush, 0)

        const onHidden = () => {
            if (document.visibilityState === 'hidden') void flush()
        }

        window.addEventListener('online', flush)
        document.addEventListener('visibilitychange', onHidden)

        return () => {
            window.removeEventListener('online', flush)
            document.removeEventListener('visibilitychange', onHidden)
            window.clearTimeout(timer.current)
            if (latest.current !== saved.current) void flush()
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const unsaved = state.status === 'dirty' || state.status === 'saving'

    useEffect(() => {
        if (!unsaved) return
        const warn = (event) => { event.preventDefault(); event.returnValue = '' }
        window.addEventListener('beforeunload', warn)
        return () => window.removeEventListener('beforeunload', warn)
    }, [unsaved])

    const submit = useClassworkMutation(
        (data, url) => axios.post(`${url}/assignments/${assignment.id}/submit`, data),
        () => {
            submittedRef.current = true
            clearBackup(storageKey)
            setConfirm(false)
            toast.success('Assignment turned in', { description: assignment.title })
        }
    )

    const empty = !answer.trim() && fileCount === 0
    const pastDue = isPastDue(assignment.due_at)
    const turningIn = [
        answer.trim() && 'your answer',
        fileCount > 0 && `${fileCount} attached file${fileCount === 1 ? '' : 's'}`,
    ].filter(Boolean).join(' and ')

    return (
        <div className="space-y-4">
            {pastDue && (
                <div role="note" className="flex gap-2 rounded-lg border border-amber-600/25 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-200">
                    <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    <p>This was due {formatDateTime(assignment.due_at)}. You can still turn it in, but it will be marked late.</p>
                </div>
            )}

            {showRestored && (
                <div role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/40 p-3 text-sm">
                    <p>Restored unsaved changes from this device.</p>
                    <div className="flex gap-1">
                        <Button type="button" variant="ghost" size="sm" onClick={revertToSaved}>
                            Use the earlier version
                        </Button>
                        <Button type="button" variant="secondary" size="sm" onClick={() => setShowRestored(false)}>
                            Keep
                        </Button>
                    </div>
                </div>
            )}

            <div className="space-y-2">
                <label htmlFor={answerId} className="text-sm font-medium">
                    Your answer
                </label>

                <Textarea
                    id={answerId}
                    value={answer}
                    onChange={(event) => change(event.target.value)}
                    onBlur={() => void flush()}
                    maxLength={20000}
                    disabled={submit.isPending}
                    aria-describedby={statusId}
                    placeholder="Type your answer here…"
                    className="block min-h-32 w-full max-md:text-base"
                />

                <div id={statusId}>
                    <SaveStatus state={state} onRetry={() => void flush()} />
                </div>

                {/* Announce only problems; routine saves stay quiet. */}
                <p className="sr-only" role="status">
                    {state.status === 'error'
                        ? 'Your answer could not be saved.'
                        : state.status === 'offline'
                            ? 'You are offline. Your answer will save when you reconnect.'
                            : ''}
                </p>
            </div>

            <Files
                kind="submissions"
                id={submission?.id ?? null}
                editable={!submit.isPending}
                onBusyChange={setUploading}
                ensureId={ensureId}
                headingLevel={6}
            />

            <div className="space-y-2">
                <Button
                    type="button"
                    disabled={uploading || submit.isPending || empty}
                    onClick={() => {
                        window.clearTimeout(timer.current)
                        submit.reset()
                        setConfirm(true)
                    }}
                    className="w-full sm:w-auto"
                >
                    Turn in
                </Button>

                <p className="text-xs text-muted-foreground">
                    {empty
                        ? 'Write an answer or attach a file to turn this in.'
                        : 'Once turned in, your work can no longer be changed.'}
                </p>
            </div>

            <AlertDialog
                open={confirm}
                onOpenChange={(open) => {
                    if (!submit.isPending) setConfirm(open)
                }}
            >
                <AlertDialogContent className="w-[calc(100%-2rem)] rounded-xl sm:w-full">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Turn in this assignment?</AlertDialogTitle>

                        <AlertDialogDescription>
                            Your instructor will see {turningIn || 'your work'}.
                            {' '}You can't change it afterward.
                            {pastDue ? ' It will be marked late.' : ''}
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <ErrorNotice error={submit.error} />

                    <AlertDialogFooter>
                        <Button
                            variant="outline"
                            disabled={submit.isPending}
                            onClick={() => setConfirm(false)}
                        >
                            Keep editing
                        </Button>

                        <Button
                            disabled={submit.isPending}
                            onClick={() => submit.mutate({ answer: latest.current })}
                        >
                            {submit.isPending ? 'Turning in…' : 'Turn in'}
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}

export default function StudentWork({ assignment }) {
    const query = useClassworkQuery(`assignments/${assignment.id}/mine`)
    const headingId = useId()

    const submission = query.data?.submission ?? null
    const score = query.data?.score ?? null
    const closed = !assignment.allow_late && isPastDue(assignment.due_at)

    return (
        <section aria-labelledby={headingId} className="space-y-3 border-t border-border pt-4">
            <h5 id={headingId} className="text-lg font-semibold text-foreground">
                Your work
            </h5>

            {query.isPending && (
                <p role="status" className="text-sm text-muted-foreground">
                    Loading your work…
                </p>
            )}

            <ErrorNotice error={query.error} />

            {query.isError && (
                <Button type="button" variant="outline" size="sm" onClick={() => query.refetch()}>
                    Try again
                </Button>
            )}

            {query.isSuccess && (
                submission?.submitted_at ? (
                    <TurnedIn assignment={assignment} submission={submission} score={score} />
                ) : closed ? (
                    <Closed assignment={assignment} submission={submission} score={score} />
                ) : (
                    <Draft key={assignment.id} assignment={assignment} submission={submission} />
                )
            )}
        </section>
    )
}
