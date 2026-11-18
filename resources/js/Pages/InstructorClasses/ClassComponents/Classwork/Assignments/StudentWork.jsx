import React, { useCallback, useEffect, useId, useRef, useState } from 'react'
import axios from 'axios'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Check, CloudOff, Loader2, Plus, TriangleAlert, X } from 'lucide-react'

import { Button } from '@/Components/ui/button'
import { Input } from '@/Components/ui/input'
import { Textarea } from '@/Components/ui/textarea'

import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/Components/ui/alert-dialog'

import AnswerList, { answerItems } from '../Shared/AnswerList'
import Files from '../Shared/Files'
import LinkList from '../Shared/LinkList'
import StatusBadge from '../Shared/StatusBadge'

import {
    ErrorNotice,
    errorMessage,
    formatDateTime,
    formatTime,
    isLate,
    isPastDue,
    studentStatus,
    useClasswork,
    useClassworkMutation,
    useClassworkQuery,
} from '../Shared/api'

import {
    DEFAULT_PROMPT,
    MAX_FILES,
    SHORT_ANSWER_MAX,
    acceptAttribute,
    describeFiles,
    fileProblem,
    isAnswered,
    linkProblem,
    missingParts,
    normalizeSettings,
    requirementList,
} from '../Shared/submissionRules'

const AUTOSAVE_DELAY = 1000

const cleanLinks = (links) => links.map((link) => link.trim()).filter(Boolean)

// Comparable text for a piece of work: answers by question id, then links.
const serialize = (work) => JSON.stringify({
    answers: Object.keys(work.answers)
        .sort((a, b) => Number(a) - Number(b))
        .map((id) => [id, work.answers[id] ?? '']),
    links: cleanLinks(work.links),
})

// A copy of unsaved work stays on this device until the server has it,
// so a refresh, a closed tab or a lost connection never loses work.
function readBackup(storageKey, questions) {
    try {
        const value = JSON.parse(window.localStorage.getItem(storageKey) ?? 'null')
        if (!value || typeof value !== 'object') return null

        const answers = {}

        if (value.answers && typeof value.answers === 'object') {
            for (const question of questions) {
                const answer = value.answers[question.id]
                if (typeof answer === 'string') answers[question.id] = answer
            }
        } else if (typeof value.answer === 'string') {
            // Kept on this device before assignments had questions.
            if (value.answer && questions.length > 0) answers[questions[0].id] = value.answer
        } else {
            return null
        }

        return { answers, links: Array.isArray(value.links) ? value.links.map(String) : [] }
    } catch {
        return null
    }
}

function writeBackup(storageKey, work) {
    try {
        window.localStorage.setItem(storageKey, JSON.stringify({ ...work, at: Date.now() }))
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

// The "Your work" card: what the student hands in, with its status.
function WorkCard({ status, children }) {
    const headingId = useId()

    return (
        <section aria-labelledby={headingId} className="min-w-0 space-y-4 rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 id={headingId} className="text-base font-semibold text-foreground">
                    Your work
                </h2>
                {status && <StatusBadge tone={status.tone}>{status.label}</StatusBadge>}
            </div>

            {children}
        </section>
    )
}

// Answers to the assignment's questions, in the page's main column.
function AnswersCard({ count, children }) {
    const headingId = useId()

    return (
        <section aria-labelledby={headingId} className="min-w-0 space-y-5 rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
            <h2 id={headingId} className="text-base font-semibold text-foreground">
                {count === 1 ? 'Your answer' : 'Your answers'}
            </h2>

            {children}
        </section>
    )
}

function Result({ score, max, feedback }) {
    const graded = score !== null && score !== undefined

    return (
        <div className="space-y-3 border-t border-border pt-4">
            {graded ? (
                <div className="flex items-baseline justify-between gap-3">
                    <p className="text-sm font-medium text-muted-foreground">Score</p>
                    <p className="text-2xl font-semibold tabular-nums text-foreground">
                        {score}
                        <span className="text-base font-normal text-muted-foreground"> / {max}</span>
                    </p>
                </div>
            ) : (
                <p className="text-sm text-muted-foreground">
                    Not graded yet. Your score will appear here.
                </p>
            )}

            {feedback && (
                <div className="space-y-1 rounded-lg bg-muted/50 p-3">
                    <p className="text-xs font-medium text-muted-foreground">Feedback from your instructor</p>
                    <p className="whitespace-pre-wrap break-words text-sm">{feedback}</p>
                </div>
            )}
        </div>
    )
}

// The status of work that can no longer change.
function finalStatus({ score, max, submittedAt, dueAt }) {
    if (score !== null && score !== undefined) {
        return { tone: 'success', label: `Graded · ${score}/${max}` }
    }

    if (!submittedAt) return { tone: 'danger', label: 'Missing · closed' }

    return isLate(submittedAt, dueAt)
        ? { tone: 'warning', label: 'Turned in late' }
        : { tone: 'info', label: 'Turned in' }
}

// The current questions with the student's answers, then any answers to
// questions removed after the work was turned in.
function SubmittedAnswers({ questions, submission }) {
    const items = [
        ...answerItems(questions, submission?.answers),
        ...(submission?.removed_answers ?? []).map((entry) => ({
            key: `removed-${entry.question_id}`,
            label: null,
            prompt: entry.prompt,
            type: entry.type,
            value: entry.answer,
        })),
    ]

    if (!items.some((item) => isAnswered(item.value))) return null

    // The heading already says "Your answer".
    const shown = items.length === 1 && items[0].prompt === DEFAULT_PROMPT
        ? [{ ...items[0], prompt: null }]
        : items

    return (
        <AnswersCard count={items.length}>
            <AnswerList items={shown} />
        </AnswersCard>
    )
}

function TurnedIn({ assignment, submission, score, layout }) {
    return layout({
        answers: <SubmittedAnswers questions={assignment.questions ?? []} submission={submission} />,
        panel: (
            <WorkCard status={finalStatus({ score, max: assignment.max_score, submittedAt: submission.submitted_at, dueAt: assignment.due_at })}>
                <p className="text-sm text-muted-foreground">
                    Turned in {formatDateTime(submission.submitted_at)}
                </p>
                <LinkList links={submission.links} label="Your links" />
                <Files kind="submissions" id={submission.id} title={null} compact hideEmpty />
                <Result score={score} max={assignment.max_score} feedback={submission.feedback} />
            </WorkCard>
        ),
    })
}

function Closed({ assignment, submission, score, layout }) {
    return layout({
        answers: <SubmittedAnswers questions={assignment.questions ?? []} submission={submission} />,
        panel: (
            <WorkCard status={finalStatus({ score, max: assignment.max_score, submittedAt: null, dueAt: assignment.due_at })}>
                <div role="note" className="flex gap-2 rounded-lg border border-destructive/25 bg-destructive/5 p-3 text-sm">
                    <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
                    <p>
                        This assignment closed {formatDateTime(assignment.due_at)} and no longer
                        accepts work. Ask your instructor if you still need to turn it in.
                    </p>
                </div>
                <LinkList links={submission?.links} label="Your links" />
                {submission && <Files kind="submissions" id={submission.id} title={null} compact hideEmpty />}
                <Result score={score} max={assignment.max_score} feedback={submission?.feedback} />
            </WorkCard>
        ),
    })
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
                    You're offline. Your work is kept on this device and saves when you reconnect.
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
                    Your work saves automatically as you go.
                </span>
            )
    }
}

// What answering the questions takes, with progress so far.
function QuestionProgress({ settings, questions, answered }) {
    const [requirement] = requirementList(settings, questions)
    const percent = questions.length ? Math.round(answered / questions.length * 100) : 0

    return (
        <div className="space-y-2">
            {requirement && <p className="text-sm text-foreground">{requirement.label}</p>}
            <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Answered</span>
                    <span className="tabular-nums">{answered} of {questions.length}</span>
                </div>
                <div
                    role="progressbar"
                    aria-label="Questions answered"
                    aria-valuemin={0}
                    aria-valuemax={questions.length}
                    aria-valuenow={answered}
                    className="h-1.5 overflow-hidden rounded-full bg-muted"
                >
                    <div className="h-full rounded-full bg-primary transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${percent}%` }} />
                </div>
            </div>
        </div>
    )
}

function QuestionField({ question, number, total, value, disabled, describedBy, onChange, onBlur }) {
    const id = useId()
    const labelId = `${id}-label`
    const countId = `${id}-count`
    const short = question.type === 'short_answer'
    const nearLimit = short && value.length > SHORT_ANSWER_MAX - 100

    return (
        <div className="space-y-2">
            <div id={labelId}>
                {total > 1 && (
                    <span className="block text-xs font-medium text-muted-foreground">
                        Question {number} of {total}
                    </span>
                )}
                {/* A lone question must be answered, whatever its flag. */}
                <span className="block whitespace-pre-wrap break-words text-sm font-medium text-foreground">
                    {question.prompt}
                    {!question.required && total > 1 && <span className="font-normal text-muted-foreground"> (optional)</span>}
                </span>
            </div>

            {short ? (
                <>
                    <Input
                        id={id}
                        value={value}
                        maxLength={SHORT_ANSWER_MAX}
                        autoComplete="off"
                        disabled={disabled}
                        aria-labelledby={labelId}
                        aria-describedby={[nearLimit && countId, describedBy].filter(Boolean).join(' ') || undefined}
                        placeholder="Type a short answer…"
                        onChange={(event) => onChange(event.target.value)}
                        onBlur={onBlur}
                        className="h-10 max-md:text-base"
                    />
                    {nearLimit && (
                        <p id={countId} className="text-right text-xs tabular-nums text-muted-foreground">
                            {value.length}/{SHORT_ANSWER_MAX}
                        </p>
                    )}
                </>
            ) : (
                <Textarea
                    id={id}
                    value={value}
                    maxLength={20000}
                    disabled={disabled}
                    aria-labelledby={labelId}
                    aria-describedby={describedBy}
                    placeholder="Type your answer here…"
                    onChange={(event) => onChange(event.target.value)}
                    onBlur={onBlur}
                    className="block min-h-32 w-full max-md:text-base"
                />
            )}
        </div>
    )
}

function Draft({ assignment, submission, onTurnedIn, layout }) {
    const { base, key } = useClasswork()
    const client = useQueryClient()

    const settings = normalizeSettings(assignment.submission_settings)
    const questions = settings.type === 'questions' ? (assignment.questions ?? []) : []

    const mineKey = [...key, `assignments/${assignment.id}/mine`]
    const storageKey = `classwork-draft:${key.slice(1).join(':')}:${assignment.id}`

    // What the server has: an answer for each current question, and links.
    const [server] = useState(() => {
        const saved = submission?.answers ?? {}

        return {
            answers: Object.fromEntries(questions.map((question) => [question.id, saved[question.id] ?? ''])),
            links: settings.links.enabled ? (submission?.links ?? []) : [],
        }
    })

    const [restored] = useState(() => {
        const backup = readBackup(storageKey, questions)
        if (!backup) return null

        const merged = {
            answers: { ...server.answers, ...backup.answers },
            links: settings.links.enabled ? backup.links : [],
        }

        return serialize(merged) !== serialize(server) ? merged : null
    })

    const initial = restored ?? server
    const [answers, setAnswers] = useState(initial.answers)
    const [links, setLinks] = useState(() =>
        settings.links.enabled && initial.links.length === 0 ? [''] : initial.links
    )
    const [touched, setTouched] = useState(() => new Set())
    const [showRestored, setShowRestored] = useState(restored !== null)
    const [state, setState] = useState(() =>
        restored !== null ? { status: 'dirty' } : { status: submission ? 'saved' : 'idle' }
    )
    const [uploading, setUploading] = useState(false)
    const [confirm, setConfirm] = useState(false)

    const statusId = useId()
    const linksId = useId()

    const latest = useRef({ answers: initial.answers, links: initial.links })
    const saved = useRef(serialize(server))
    const submissionRef = useRef(submission)
    const chain = useRef(Promise.resolve())
    const timer = useRef(null)
    const submittedRef = useRef(false)
    const questionsRef = useRef(questions)

    submissionRef.current = submission ?? submissionRef.current
    questionsRef.current = questions

    const files = useClassworkQuery(`submissions/${submission?.id ?? 'pending'}/files`, {
        enabled: Boolean(submission?.id),
    })
    const fileCount = files.data?.length ?? 0

    // Only the parts this assignment accepts are sent: an answer for every
    // question (by id) and the links.
    const payload = useCallback((work) => {
        const asked = questionsRef.current

        return {
            ...(asked.length > 0
                ? { answers: Object.fromEntries(asked.map((question) => [question.id, work.answers[question.id] ?? ''])) }
                : {}),
            ...(settings.links.enabled ? { links: cleanLinks(work.links) } : {}),
        }
    }, [settings.links.enabled])

    // Requests are queued so autosaves and draft creation never race.
    const post = useCallback((work) => {
        const run = chain.current.then(() =>
            axios.post(`${base}/assignments/${assignment.id}/draft`, payload(work))
        )
        chain.current = run.catch(() => {})
        return run
    }, [base, assignment.id, payload])

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

    const saveNow = useCallback(async (work) => {
        const snapshot = serialize(work)
        const { data } = await post(work)
        saved.current = snapshot
        remember(data)

        if (serialize(latest.current) === snapshot) {
            clearBackup(storageKey)
            setState({ status: 'saved', at: new Date() })
        }

        return data
    }, [post, remember, storageKey])

    const flush = useCallback(async () => {
        window.clearTimeout(timer.current)

        if (submittedRef.current) return

        const work = latest.current

        if (serialize(work) === saved.current) {
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
            await saveNow(work)
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

    function change(patch) {
        const next = { ...latest.current, ...patch }
        latest.current = next
        if ('answers' in patch) setAnswers(patch.answers)
        if ('links' in patch) setLinks(patch.links)
        writeBackup(storageKey, next)
        setState((current) => ({ status: 'dirty', at: current.at }))
        window.clearTimeout(timer.current)
        timer.current = window.setTimeout(flush, AUTOSAVE_DELAY)
    }

    function changeAnswer(questionId, value) {
        change({ answers: { ...latest.current.answers, [questionId]: value } })
    }

    function revertToSaved() {
        setShowRestored(false)
        change({
            answers: server.answers,
            links: settings.links.enabled && server.links.length === 0 ? [''] : server.links,
        })
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
            if (serialize(latest.current) !== saved.current) void flush()
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
        (response) => {
            submittedRef.current = true
            clearBackup(storageKey)
            setConfirm(false)
            toast.success('Assignment turned in', { description: assignment.title })
            // The response is the turned-in work; show it right away rather
            // than waiting for the refetched query to reach this component.
            onTurnedIn?.(response.data)
        }
    )

    const filledLinks = cleanLinks(links)
    const answered = questions.filter((question) => isAnswered(answers[question.id])).length
    const missing = missingParts(settings, { questions, answers, fileCount, links })
    const pastDue = isPastDue(assignment.due_at)
    const turningIn = [
        answered > 0 && (questions.length === 1
            ? 'your answer'
            : `your answers to ${answered} of ${questions.length} questions`),
        filledLinks.length > 0 && `${filledLinks.length} link${filledLinks.length === 1 ? '' : 's'}`,
        fileCount > 0 && `${fileCount} attached file${fileCount === 1 ? '' : 's'}`,
    ].filter(Boolean).join(', ')

    function updateLink(index, value) {
        change({ links: links.map((link, position) => position === index ? value : link) })
    }

    function removeLink(index) {
        const next = links.filter((_, position) => position !== index)
        setTouched(new Set())
        change({ links: next.length ? next : [''] })
    }

    const restoredNote = showRestored && (
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
    )

    // Autosave status, shown next to whatever the student types into.
    const saveStatus = (
        <>
            <div id={statusId}>
                <SaveStatus state={state} onRetry={() => void flush()} />
            </div>

            {/* Announce only problems; routine saves stay quiet. */}
            <p className="sr-only" role="status">
                {state.status === 'error'
                    ? 'Your work could not be saved.'
                    : state.status === 'offline'
                        ? 'You are offline. Your work will save when you reconnect.'
                        : ''}
            </p>
        </>
    )

    const answersCard = questions.length > 0 && (
        <AnswersCard count={questions.length}>
            {restoredNote}

            <ol className="space-y-6">
                {questions.map((question, index) => (
                    <li key={question.id}>
                        <QuestionField
                            question={question}
                            number={index + 1}
                            total={questions.length}
                            value={answers[question.id] ?? ''}
                            disabled={submit.isPending}
                            describedBy={statusId}
                            onChange={(value) => changeAnswer(question.id, value)}
                            onBlur={() => void flush()}
                        />
                    </li>
                ))}
            </ol>

            {saveStatus}
        </AnswersCard>
    )

    const panel = (
        <WorkCard status={studentStatus(assignment)}>
            {pastDue && (
                <div role="note" className="flex gap-2 rounded-lg border border-amber-600/25 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-200">
                    <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                    <p>This was due {formatDateTime(assignment.due_at)}. You can still turn it in, but it will be marked late.</p>
                </div>
            )}

            {questions.length > 0 && (
                <QuestionProgress settings={settings} questions={questions} answered={answered} />
            )}

            {settings.links.enabled && (
                <>
                    {restoredNote}

                    <fieldset className="min-w-0 space-y-2" aria-describedby={`${linksId}-help`}>
                        <legend className="text-sm font-medium">Links</legend>
                        <p id={`${linksId}-help`} className="text-xs text-muted-foreground">
                            Paste full web addresses{settings.links.domain ? ` on ${settings.links.domain}` : ''}.
                            {' '}Up to {settings.links.max_links}.
                        </p>

                        {links.map((link, index) => {
                            const value = link.trim()
                            const problem = value && touched.has(index) ? linkProblem(value, settings.links) : null

                            return (
                                <div key={index} className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <Input
                                            type="url"
                                            inputMode="url"
                                            autoComplete="off"
                                            value={link}
                                            disabled={submit.isPending}
                                            aria-label={`Link ${index + 1}`}
                                            aria-invalid={Boolean(problem)}
                                            placeholder={settings.links.domain ? `https://${settings.links.domain}/…` : 'https://…'}
                                            onChange={(event) => updateLink(index, event.target.value)}
                                            onBlur={() => {
                                                setTouched((current) => new Set(current).add(index))
                                                void flush()
                                            }}
                                            className="h-10 min-w-0 flex-1 max-md:text-base"
                                        />
                                        {(links.length > 1 || value) && (
                                            <Button type="button" variant="ghost" size="icon" className="size-10 shrink-0"
                                                aria-label={`Remove link ${index + 1}`} disabled={submit.isPending}
                                                onClick={() => removeLink(index)}>
                                                <X className="size-4" aria-hidden="true" />
                                            </Button>
                                        )}
                                    </div>
                                    {problem && <p className="text-xs text-destructive">{problem}</p>}
                                </div>
                            )
                        })}

                        {links.length < settings.links.max_links && (
                            <Button type="button" variant="outline" size="sm" disabled={submit.isPending}
                                onClick={() => change({ links: [...links, ''] })}>
                                <Plus className="size-4" aria-hidden="true" />
                                Add link
                            </Button>
                        )}
                    </fieldset>

                    {saveStatus}
                </>
            )}

            {/* Files can linger from before the assignment changed type;
                they can still be removed, but no new ones added. */}
            {(settings.files.enabled || fileCount > 0) && (
                <Files
                    kind="submissions"
                    id={submission?.id ?? null}
                    title={null}
                    compact
                    removable={!submit.isPending}
                    editable={settings.files.enabled && !submit.isPending}
                    onBusyChange={setUploading}
                    ensureId={ensureId}
                    accept={acceptAttribute(settings.files)}
                    checkFile={(file) => fileProblem(file, settings.files)}
                    maxFiles={MAX_FILES}
                    hint={describeFiles(settings.files) + '.'}
                />
            )}

            <div className="space-y-2 border-t border-border pt-4">
                <Button
                    type="button"
                    disabled={uploading || submit.isPending || missing.length > 0}
                    onClick={() => {
                        window.clearTimeout(timer.current)
                        submit.reset()
                        setConfirm(true)
                    }}
                    className="h-11 w-full"
                >
                    Turn in
                </Button>

                {missing.length > 0 ? (
                    <ul className="space-y-0.5 text-center text-xs text-muted-foreground">
                        {missing.map((message) => <li key={message}>{message}</li>)}
                    </ul>
                ) : (
                    <p className="text-center text-xs text-muted-foreground">
                        Once turned in, your work can no longer be changed.
                    </p>
                )}
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
                            onClick={() => submit.mutate(payload(latest.current))}
                        >
                            {submit.isPending ? 'Turning in…' : 'Turn in'}
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </WorkCard>
    )

    return layout({ answers: answersCard || null, panel })
}

// Without a layout, the answers and the panel simply stack.
const stack = ({ answers, panel }) => (
    <div className="space-y-4">
        {answers}
        {panel}
    </div>
)

/**
 * A student's own work on an assignment. Renders `children({ answers,
 * panel })`: `panel` is the "Your work" card (status, files, links, Turn
 * in); `answers` holds the answers to questions (null otherwise), which
 * need the width of the main column.
 */
export default function StudentWork({ assignment, children = stack }) {
    const query = useClassworkQuery(`assignments/${assignment.id}/mine`)

    // Set from the turn-in response, so the page switches immediately.
    const [turnedIn, setTurnedIn] = useState(null)

    const fromQuery = query.data?.submission ?? null
    const submission = fromQuery?.submitted_at ? fromQuery : (turnedIn?.submission ?? fromQuery)
    const score = query.data?.score ?? turnedIn?.score ?? null
    const closed = !assignment.allow_late && isPastDue(assignment.due_at)

    if (query.isPending || query.isError) {
        return children({
            answers: null,
            panel: (
                <WorkCard status={studentStatus(assignment)}>
                    {query.isPending ? (
                        <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                            Loading your work…
                        </p>
                    ) : (
                        <>
                            <ErrorNotice error={query.error} />
                            <Button type="button" variant="outline" size="sm" onClick={() => query.refetch()}>
                                Try again
                            </Button>
                        </>
                    )}
                </WorkCard>
            ),
        })
    }

    if (submission?.submitted_at) {
        return <TurnedIn assignment={assignment} submission={submission} score={score} layout={children} />
    }

    if (closed) {
        return <Closed assignment={assignment} submission={submission} score={score} layout={children} />
    }

    return (
        <Draft
            key={assignment.id}
            assignment={assignment}
            submission={submission}
            onTurnedIn={setTurnedIn}
            layout={children}
        />
    )
}
