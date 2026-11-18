import React, { useEffect, useId, useRef, useState } from 'react'
import axios from 'axios'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, PenLine, Search, X } from 'lucide-react'

import { Badge } from '@/Components/ui/badge'
import { Button } from '@/Components/ui/button'
import { Input } from '@/Components/ui/input'
import { Textarea } from '@/Components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select'
import { cn } from '@/Lib/Utils'
import {
    Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle,
} from '@/Components/ui/drawer'

import AnswerList, { answerItems } from '../Shared/AnswerList'
import Files from '../Shared/Files'
import LinkList from '../Shared/LinkList'
import NumberInput from '../Shared/NumberInput'
import StatusBadge from '../Shared/StatusBadge'
import { isAnswered } from '../Shared/submissionRules'
import useIsMobile from '../Shared/useIsMobile'
import {
    ErrorNotice, formatDate, formatDateTime, isLate,
    refreshGrading, useClassworkMutation, useClassworkQuery,
} from '../Shared/api'

const statusOptions = [
    { value: 'all', label: 'All students' },
    { value: 'submitted', label: 'Needs grading' },
    { value: 'graded', label: 'Graded' },
    { value: 'not-submitted', label: 'Not turned in' },
]

function hasScore(row) {
    return row.score !== null && row.score !== undefined && row.score !== ''
}

function submissionStatus(row) {
    if (!row.submitted_at) return 'not-submitted'
    return hasScore(row) ? 'graded' : 'submitted'
}

function fullName(row) {
    return [row.last_name, row.first_name].filter(Boolean).join(', ') || 'Unnamed student'
}

function searchText(value) {
    return String(value ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/,/g, ' ').toLowerCase()
}

function RowStatus({ row, assignment }) {
    const status = submissionStatus(row)
    const late = isLate(row.submitted_at, assignment.due_at)

    if (status === 'graded') {
        return <StatusBadge tone="success">Graded · {row.score}/{assignment.max_score}{late ? ' · late' : ''}</StatusBadge>
    }

    if (status === 'submitted') {
        return (
            <StatusBadge tone={late ? 'warning' : 'info'}>
                {late ? 'Late · needs grading' : 'Needs grading'} · {formatDate(row.submitted_at)}
            </StatusBadge>
        )
    }

    return (
        <StatusBadge tone="neutral">
            {hasScore(row) ? `Not turned in · scored ${row.score}/${assignment.max_score}` : 'Not turned in'}
        </StatusBadge>
    )
}

function GradeForm({ assignment, student, nextId, dirtyRef, focusScore, pending, onDiscard, onKeepEditing, onSaved }) {
    const isMobile = useIsMobile()
    const client = useQueryClient()
    const max = Number(assignment.max_score)

    const initialScore = student.score ?? ''
    const initialFeedback = student.feedback ?? ''
    const [score, setScore] = useState(initialScore)
    const [feedback, setFeedback] = useState(initialFeedback)

    const scoreId = useId()
    const feedbackId = useId()
    const answerId = useId()

    const dirty = String(score) !== String(initialScore) || feedback !== initialFeedback
    const valid = score === '' || (Number.isInteger(Number(score)) && Number(score) >= 0 && Number(score) <= max)
    const late = isLate(student.submitted_at, assignment.due_at)

    // The current questions in order, then any answers to questions the
    // teacher removed after this work was turned in.
    const saved = student.answers ?? []
    const answers = answerItems(
        assignment.questions ?? [],
        Object.fromEntries(saved.filter((entry) => !entry.removed).map((entry) => [entry.question_id, entry.answer]))
    )
    const removedAnswers = saved
        .filter((entry) => entry.removed && isAnswered(entry.answer))
        .map((entry) => ({
            key: `removed-${entry.question_id}`,
            label: null,
            prompt: entry.prompt,
            type: entry.type,
            value: entry.answer,
        }))

    useEffect(() => {
        dirtyRef.current = dirty
    }, [dirty, dirtyRef])

    // Keyboard grading: after "Save & next", land in the next score field.
    // Skipped on phones, where focusing would cover the answer with the keyboard.
    useEffect(() => {
        if (focusScore && !isMobile) document.getElementById(scoreId)?.focus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const save = useClassworkMutation(
        (data, base) => axios.put(
            `${base}/assignments/${assignment.id}/submissions/${student.submission_id}/grade`, data
        ),
        () => refreshGrading(client)
    )

    function submit(advance) {
        if (!valid || save.isPending) return

        save.mutate(
            { score: score === '' ? null : Number(score), feedback },
            {
                onSuccess: () => {
                    toast.success(`Saved · ${fullName(student)}`, {
                        description: score === '' ? 'Left ungraded' : `Score ${score}/${max}`,
                    })
                    onSaved(advance)
                },
            }
        )
    }

    return (
        <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={(event) => {
                event.preventDefault()
                submit(true)
            }}
        >
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-4">
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <span>Turned in {formatDateTime(student.submitted_at)}</span>
                    {late && <StatusBadge tone="warning">Late</StatusBadge>}
                </div>

                {answers.length > 0 && (
                    <section aria-labelledby={answerId} className="space-y-2">
                        <h3 id={answerId} className="text-sm font-medium">
                            {answers.length === 1 ? 'Answer' : 'Answers'}
                        </h3>
                        <AnswerList items={answers} />
                    </section>
                )}

                {removedAnswers.length > 0 && (
                    <section aria-labelledby={`${answerId}-removed`} className="space-y-2">
                        <div>
                            <h3 id={`${answerId}-removed`} className="text-sm font-medium">Answers to removed questions</h3>
                            <p className="text-xs text-muted-foreground">
                                These questions are no longer part of this assignment.
                            </p>
                        </div>
                        <AnswerList items={removedAnswers} />
                    </section>
                )}

                <LinkList links={student.links} />

                <Files kind="submissions" id={student.submission_id} headingLevel={3} />

                <div className="space-y-2">
                    <label htmlFor={scoreId} className="text-sm font-medium">
                        Score <span className="font-normal text-muted-foreground">out of {max}</span>
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                        <NumberInput
                            id={scoreId}
                            value={score}
                            onValueChange={setScore}
                            min={0}
                            max={max}
                            disabled={save.isPending}
                            placeholder="—"
                            aria-invalid={!valid}
                            aria-describedby={`${scoreId}-help`}
                            enterKeyHint="next"
                        />
                        <Button type="button" variant="ghost" size="sm" disabled={save.isPending} onClick={() => setScore(max)}>
                            Full marks
                        </Button>
                    </div>
                    <p id={`${scoreId}-help`} className={valid ? 'text-xs text-muted-foreground' : 'text-xs text-destructive'}>
                        {valid
                            ? 'Leave blank to keep it ungraded. 0 is a recorded score.'
                            : `Enter a whole number from 0 to ${max}.`}
                    </p>
                </div>

                <div className="space-y-2">
                    <label htmlFor={feedbackId} className="text-sm font-medium">
                        Feedback <span className="font-normal text-muted-foreground">(optional, shown to the student)</span>
                    </label>
                    <Textarea
                        id={feedbackId}
                        value={feedback}
                        onChange={(event) => setFeedback(event.target.value)}
                        maxLength={10000}
                        disabled={save.isPending}
                        className="block min-h-24 w-full max-md:text-base"
                    />
                </div>

                <ErrorNotice error={save.error} />
            </div>

            <DrawerFooter className="flex-row flex-wrap items-center justify-end gap-2 border-t border-border bg-background p-4">
                {pending ? (
                    <>
                        <p role="alert" className="w-full text-sm sm:mr-auto sm:w-auto">
                            Discard your unsaved changes?
                        </p>
                        <Button type="button" variant="ghost" onClick={onKeepEditing}>Keep editing</Button>
                        <Button type="button" variant="destructive" onClick={onDiscard}>Discard</Button>
                    </>
                ) : (
                    <>
                        <Button type="button" variant="outline" disabled={!valid || save.isPending} onClick={() => submit(false)}>
                            Save
                        </Button>
                        <Button type="submit" disabled={!valid || save.isPending}>
                            {save.isPending ? 'Saving…' : nextId ? 'Save & next' : 'Save & finish'}
                        </Button>
                    </>
                )}
            </DrawerFooter>
        </form>
    )
}

function GradingPanel({ assignment, students, sequence, startId, onClose }) {
    const isMobile = useIsMobile()
    const [open, setOpen] = useState(false)
    const [currentId, setCurrentId] = useState(startId)
    const [pending, setPending] = useState(null)
    const [navigated, setNavigated] = useState(false)
    const [announcement, setAnnouncement] = useState('')
    const dirtyRef = useRef(false)

    // Mount closed, then open so the entry transition runs.
    useEffect(() => {
        setOpen(true)
    }, [])

    const student = students.find((row) => String(row.submission_id) === String(currentId))
    const position = sequence.indexOf(String(currentId))
    const prevId = position > 0 ? sequence[position - 1] : null
    const nextId = position >= 0 && position < sequence.length - 1 ? sequence[position + 1] : null

    function move(target) {
        setPending(null)
        dirtyRef.current = false

        if (target === 'close') {
            setOpen(false)
            return
        }

        const next = students.find((row) => String(row.submission_id) === String(target))
        const nextPosition = sequence.indexOf(String(target))
        setNavigated(true)
        setCurrentId(target)
        setAnnouncement(next ? `${fullName(next)}, ${nextPosition + 1} of ${sequence.length}` : '')
    }

    function go(target) {
        if (!target) return
        if (dirtyRef.current) {
            setPending(target)
            return
        }
        move(target)
    }

    return (
        <Drawer
            open={open}
            swipeDirection={isMobile ? 'down' : 'right'}
            showSwipeHandle={false}
            disablePointerDismissal
            onOpenChange={(next, details) => {
                if (!next) {
                    details.cancel()
                    go('close')
                    return
                }
                setOpen(true)
            }}
            onOpenChangeComplete={(isOpen) => {
                if (!isOpen) onClose()
            }}
        >
            <DrawerContent
                data-base-ui-swipe-ignore
                className="overflow-hidden data-[swipe-axis=y]:h-[92dvh] data-[swipe-axis=y]:max-h-[92dvh] data-[swipe-axis=x]:w-[calc(100vw-1rem)] data-[swipe-axis=x]:sm:w-[34rem]"
            >
                <DrawerHeader className="gap-1 border-b border-border p-4 text-left group-data-[swipe-axis=y]/drawer-popup:text-left">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <DrawerTitle className="truncate">
                                {student ? fullName(student) : 'Submission'}
                            </DrawerTitle>
                            <DrawerDescription>
                                {[student?.user_id_no, position >= 0 && `${position + 1} of ${sequence.length}`]
                                    .filter(Boolean).join(' · ') || assignment.title}
                            </DrawerDescription>
                        </div>

                        <div className="flex shrink-0 items-center gap-1">
                            <Button type="button" variant="outline" size="icon" aria-label="Previous student" disabled={!prevId} onClick={() => go(prevId)}>
                                <ChevronLeft className="size-4" aria-hidden="true" />
                            </Button>
                            <Button type="button" variant="outline" size="icon" aria-label="Next student" disabled={!nextId} onClick={() => go(nextId)}>
                                <ChevronRight className="size-4" aria-hidden="true" />
                            </Button>
                            <Button type="button" variant="ghost" size="icon" aria-label="Close grading" onClick={() => go('close')}>
                                <X className="size-4" aria-hidden="true" />
                            </Button>
                        </div>
                    </div>
                </DrawerHeader>

                <p className="sr-only" aria-live="polite">{announcement}</p>

                {student ? (
                    <GradeForm
                        key={currentId}
                        assignment={assignment}
                        student={student}
                        nextId={nextId}
                        dirtyRef={dirtyRef}
                        focusScore={navigated}
                        pending={pending}
                        onDiscard={() => move(pending)}
                        onKeepEditing={() => setPending(null)}
                        onSaved={(advance) => {
                            dirtyRef.current = false
                            if (!advance) return
                            if (nextId) move(nextId)
                            else move('close')
                        }}
                    />
                ) : (
                    <p className="p-4 text-sm text-muted-foreground">
                        This submission is no longer available.
                    </p>
                )}
            </DrawerContent>
        </Drawer>
    )
}

// `page`: shown on the assignment's own page, where the list scrolls with
// the page instead of inside a box, and the tab names the section.
// `actions` sit at the end of the header row (the page's Guide button).
export default function SubmissionReview({ assignment, page = false, actions = null }) {
    const query = useClassworkQuery(`assignments/${assignment.id}/submissions`)
    const [panel, setPanel] = useState(null)
    const [search, setSearch] = useState('')
    const [status, setStatus] = useState('all')
    const headingId = useId()

    const students = query.data || []
    const turnedIn = students.filter((row) => row.submitted_at).length
    const queue = students.filter((row) => submissionStatus(row) === 'submitted' && row.submission_id)

    const terms = searchText(search).trim().split(/\s+/).filter(Boolean)
    const visibleStudents = students.filter((row) => {
        const matchesStatus = status === 'all' || submissionStatus(row) === status
        const text = searchText(`${row.last_name ?? ''} ${row.first_name ?? ''} ${row.user_id_no ?? ''}`)
        return matchesStatus && terms.every((term) => text.includes(term))
    })

    // The panel walks a fixed list, so grading someone does not make them
    // drop out of the sequence when the "Needs grading" filter is on.
    function openPanel(row) {
        const sequence = visibleStudents
            .filter((entry) => entry.submitted_at && entry.submission_id)
            .map((entry) => String(entry.submission_id))
        setPanel({ startId: String(row.submission_id), sequence })
    }

    function gradeQueue() {
        if (!queue.length) return
        setPanel({
            startId: String(queue[0].submission_id),
            sequence: queue.map((row) => String(row.submission_id)),
        })
    }

    return (
        <section aria-labelledby={headingId} className={cn('min-w-0', page ? 'space-y-4' : 'space-y-3 border-t border-border pt-4')}>
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h5 id={headingId} className={page ? 'sr-only' : 'text-lg font-semibold text-foreground'}>Student work</h5>
                {query.data && (
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" className="h-auto gap-1 rounded-lg px-3 py-1.5 text-xs font-medium tabular-nums sm:text-sm">
                            {turnedIn} / {students.length} turned in
                        </Badge>
                        {queue.length > 0 && (
                            <StatusBadge tone="info" className="py-1.5 sm:text-sm">
                                {queue.length} to grade
                            </StatusBadge>
                        )}
                    </div>
                )}
                {actions && <div className="ml-auto">{actions}</div>}
            </div>

            {queue.length > 0 && (
                <Button type="button" onClick={gradeQueue} className="w-full sm:w-auto" data-tour="review-grade-queue">
                    <PenLine className="size-4" aria-hidden="true" />
                    Grade {queue.length} submission{queue.length === 1 ? '' : 's'}
                </Button>
            )}

            <div className="flex flex-col gap-3 sm:flex-row" data-tour="review-filters">
                <div className="relative w-full min-w-0 sm:w-80 lg:w-96">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                    <Input type="search" value={search} onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search students…" aria-label="Search students" className="h-10 rounded-lg bg-transparent pl-10 dark:bg-transparent" />
                </div>
                <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger className="h-10 w-full rounded-lg data-[size=default]:h-10 dark:bg-transparent sm:w-44 sm:shrink-0" aria-label="Filter by status">
                        <SelectValue>{statusOptions.find((option) => option.value === status)?.label}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                        {statusOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                    </SelectContent>
                </Select>
            </div>

            {query.isPending && <p role="status" className="text-sm text-muted-foreground">Loading submissions…</p>}
            <ErrorNotice error={query.error} />
            {query.isError && <Button type="button" variant="outline" size="sm" onClick={() => query.refetch()}>Try again</Button>}

            {/* Phones scroll the page, not a box inside it; so does the
                assignment page, where the header row stays pinned while
                the list scrolls (overflow-clip keeps it sticky). */}
            {query.data && <div data-tour="review-list" className={cn(
                'rounded-lg border border-border bg-card',
                page ? 'overflow-clip' : 'md:max-h-[28rem] md:overflow-auto'
            )}>
                <table className="w-full table-fixed text-left text-sm" aria-label="Student submissions">
                    <colgroup><col className="sm:w-1/2" /><col className="hidden sm:table-column" /><col className="w-24 sm:w-32 lg:w-[15%]" /></colgroup>
                    <thead className="bg-muted text-sm text-muted-foreground md:sticky md:top-0 md:z-10">
                        <tr>
                            <th scope="col" className="px-3 py-2.5 font-medium sm:px-4">Student</th>
                            <th scope="col" className="hidden px-4 py-2.5 font-medium sm:table-cell">Status</th>
                            <th scope="col" className="px-3 py-2.5 text-left font-medium sm:px-4"><span className="sr-only">Action</span></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {visibleStudents.map((row) => {
                            const name = fullName(row)
                            const canReview = Boolean(row.submitted_at && row.submission_id)
                            const needsGrading = submissionStatus(row) === 'submitted'
                            return (
                                <tr key={row.student_subject_id} className="transition-colors hover:bg-muted/40">
                                    <td className="px-3 py-2 align-middle sm:px-4 sm:py-1.5">
                                        <p className="break-words font-semibold uppercase leading-5">{name}</p>
                                        <p className="break-words text-xs leading-4 text-muted-foreground">{row.user_id_no || '—'}</p>
                                        <div className="mt-2 sm:hidden">
                                            <RowStatus row={row} assignment={assignment} />
                                        </div>
                                    </td>
                                    <td className="hidden px-4 py-1.5 align-middle sm:table-cell">
                                        <RowStatus row={row} assignment={assignment} />
                                    </td>
                                    <td className="px-3 py-1.5 text-left align-middle sm:px-4">
                                        {canReview ? (
                                            <Button type="button" size="sm" variant={needsGrading ? 'default' : 'outline'}
                                                className="h-9 w-16 rounded-lg px-2.5 shadow-none sm:w-24"
                                                aria-label={`${needsGrading ? 'Grade' : 'Review'} ${name}`}
                                                onClick={() => openPanel(row)}>
                                                {needsGrading ? 'Grade' : 'Review'}
                                            </Button>
                                        ) : <span className="text-muted-foreground" aria-label="Nothing to grade yet">—</span>}
                                    </td>
                                </tr>
                            )
                        })}
                        {visibleStudents.length === 0 && <tr><td colSpan={3} className="px-4 py-8 text-center text-sm text-muted-foreground">
                            <p>{students.length ? 'No students match your search or filter.' : 'No students enrolled in this class.'}</p>
                            {students.length > 0 && <Button type="button" variant="ghost" size="sm" className="mx-auto mt-2 flex" onClick={() => { setSearch(''); setStatus('all') }}>Clear filters</Button>}
                        </td></tr>}
                    </tbody>
                </table>
            </div>}

            {panel && (
                <GradingPanel
                    assignment={assignment}
                    students={students}
                    sequence={panel.sequence}
                    startId={panel.startId}
                    onClose={() => setPanel(null)}
                />
            )}
        </section>
    )
}
