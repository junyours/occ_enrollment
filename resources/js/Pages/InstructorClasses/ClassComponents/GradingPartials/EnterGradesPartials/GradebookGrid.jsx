import React, { useEffect, useMemo, useRef, useState } from 'react'
import axios from 'axios'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { LoaderCircle, RotateCcw, Search } from 'lucide-react'

import { Button } from '@/Components/ui/button'
import IconInput from '@/Components/ui/IconInput'
import { Skeleton } from '@/Components/ui/skeleton'
import { cn } from '@/Lib/Utils'

import { fetchGradeSummary, gradeSummaryKey } from '../GradeSummary'
import { buildGradeSummary } from '../gradeCalculations'
import { scoreProblem, scoreValue, TYPABLE_SCORE } from '../scoreInput'
import { createAutosaveSession } from './useScoreAutosave'

// One saving queue per class, kept while the page is open, so scores typed
// just before switching views or periods still save.
const sessions = new Map()

// a:{assessment id}:{student subject id} or e:{exam id}:{student subject id}
const cellKey = (type, itemId, studentSubjectId) => `${type}:${itemId}:${studentSubjectId}`

const byOrder = (a, b) =>
    Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0) || Number(a.id) - Number(b.id)

const asScore = (value) =>
    value === null || value === undefined || value === '' ? null : Number(value)

// Put a saved score into the cached summary, so totals update right away.
function patchScore(snapshot, type, itemId, studentSubjectId, score) {
    if (!snapshot) return snapshot

    const exam = type === 'e'
    const listKey = exam ? 'exam_scores' : 'assessment_scores'
    const idKey = exam ? 'exam_id' : 'assessment_id'
    const rows = snapshot[listKey] ?? []
    const matches = (row) =>
        Number(row[idKey]) === itemId && Number(row.student_subject_id) === studentSubjectId

    return {
        ...snapshot,
        [listKey]: rows.some(matches)
            ? rows.map((row) => (matches(row) ? { ...row, score } : row))
            : [...rows, { [idKey]: itemId, student_subject_id: studentSubjectId, score }],
    }
}

function useGridSession(classId) {
    const queryClient = useQueryClient()

    const [session] = useState(() => {
        const key = String(classId)

        if (!sessions.has(key)) {
            sessions.set(key, createAutosaveSession(async ({ kind, studentId, value }) => {
                const [type, itemId, studentSubjectId] = kind.split(':')
                const exam = type === 'e'

                const { data } = await axios.post(
                    route(exam ? 'exam-scores.save' : 'assessment-scores.save'),
                    {
                        [exam ? 'exam_id' : 'assessment_id']: Number(itemId),
                        student_id: studentId,
                        score: value,
                    }
                )

                const saved = asScore(data?.score)

                if (saved !== null && !Number.isFinite(saved)) {
                    throw new Error('The server returned an invalid score.')
                }

                queryClient.setQueryData(gradeSummaryKey(classId), (current) =>
                    patchScore(current, type, Number(itemId), Number(studentSubjectId), saved)
                )

                // The one-assessment view reads its own copy.
                void queryClient.invalidateQueries({
                    queryKey: [exam ? 'exam-scores' : 'assessment-scores', Number(itemId)],
                })

                return saved
            }))
        }

        return sessions.get(key)
    })

    const [entries, setEntries] = useState(() => session.snapshot())
    const [navigationMessage, setNavigationMessage] = useState('')

    useEffect(() => {
        const unsubscribe = session.subscribe(() => setEntries(session.snapshot()))
        setEntries(session.snapshot())

        return () => {
            unsubscribe()
            session.flushAll()
        }
    }, [session])

    // Leaving the page waits for scores that are still saving.
    useEffect(() => {
        const beforeUnload = (event) => {
            if (!session.hasPending()) return
            event.preventDefault()
            event.returnValue = ''
        }

        const beforeVisit = (event) => {
            if (!session.hasPending()) return
            event.preventDefault()
            session.flushAll()
            setNavigationMessage('Scores are still saving. Try again in a moment.')
        }

        window.addEventListener('beforeunload', beforeUnload)
        document.addEventListener('inertia:before', beforeVisit)

        return () => {
            window.removeEventListener('beforeunload', beforeUnload)
            document.removeEventListener('inertia:before', beforeVisit)
        }
    }, [session])

    return { session, entries, navigationMessage }
}

function TermResult({ row }) {
    if (row.equivalent !== null) {
        return (
            <span className={cn('font-semibold tabular-nums', row.equivalent >= 5 && 'text-destructive')}>
                {Number(row.equivalent).toFixed(1)}
                <span className="ml-1.5 text-xs font-normal text-muted-foreground">{row.rounded_percentage}%</span>
            </span>
        )
    }

    if (row.status === 'configuration') {
        return <span className="text-xs text-muted-foreground">Needs setup</span>
    }

    if (row.status === 'invalid') {
        return <span className="text-xs text-destructive">Check scores</span>
    }

    return <span className="text-xs text-muted-foreground">{row.missing} missing</span>
}

function GridSkeleton() {
    return (
        <div role="status" aria-label="Loading gradebook" className="space-y-2 rounded-xl border p-3">
            {Array.from({ length: 7 }, (_, index) => (
                <div key={index} className="flex items-center gap-3">
                    <Skeleton className="h-6 w-44" />
                    {Array.from({ length: 5 }, (__, column) => <Skeleton key={column} className="h-6 w-12" />)}
                </div>
            ))}
        </div>
    )
}

/**
 * Every score for one term in one table: students down the side, each
 * assessment (grouped by category) and the exam across the top, and the
 * term grade at the end. Scores save as they are typed, like the
 * one-assessment view; a score that can't be saved is marked until fixed.
 */
export default function GradebookGrid({ classId, period, periodLabel, onOpenAssessment, onOpenExam }) {
    const query = useQuery({
        queryKey: gradeSummaryKey(classId),
        queryFn: ({ signal }) => fetchGradeSummary(classId, signal),
        staleTime: 0,
        refetchOnMount: 'always',
        refetchOnWindowFocus: true,
        retry: (count, error) => count < 1 && (!error.response?.status || error.response.status >= 500),
    })

    const { session, entries, navigationMessage } = useGridSession(classId)
    const [texts, setTexts] = useState(() => new Map())
    const [problems, setProblems] = useState(() => new Map())
    const [search, setSearch] = useState('')
    const inputs = useRef(new Map())

    const summary = useMemo(() => buildGradeSummary(query.data, period), [query.data, period])

    const groups = summary.categories.filter((category) => category.assessments.length > 0)
    const emptyCategories = summary.categories.filter((category) => category.assessments.length === 0)

    const columns = useMemo(() => {
        const list = []

        for (const category of groups) {
            for (const assessment of [...category.assessments].sort(byOrder)) {
                list.push({
                    type: 'a',
                    id: Number(assessment.id),
                    name: assessment.name || `Assessment ${assessment.id}`,
                    max: Number(assessment.max_score),
                    categoryId: Number(category.id),
                })
            }
        }

        if (summary.exam) {
            list.push({
                type: 'e',
                id: Number(summary.exam.id),
                name: summary.exam.name || `${periodLabel} exam`,
                max: Number(summary.exam.max_score),
            })
        }

        return list
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [summary, periodLabel])

    const saved = useMemo(() => {
        const map = new Map()

        for (const row of query.data?.assessment_scores ?? []) {
            map.set(cellKey('a', Number(row.assessment_id), Number(row.student_subject_id)), asScore(row.score))
        }

        for (const row of query.data?.exam_scores ?? []) {
            map.set(cellKey('e', Number(row.exam_id), Number(row.student_subject_id)), asScore(row.score))
        }

        return map
    }, [query.data])

    const needle = search.trim().toLowerCase()
    const rows = summary.rows.filter((row) =>
        !needle || `${row.name} ${row.user_id_no ?? ''}`.toLowerCase().includes(needle)
    )

    function display(key) {
        if (texts.has(key)) return texts.get(key)

        const entry = entries.get(key)
        const value = entry?.dirty ? entry.value : saved.get(key)

        return value === null || value === undefined ? '' : String(value)
    }

    function change(column, row, key, text) {
        if (!TYPABLE_SCORE.test(text)) return

        const savedValue = saved.get(key) ?? null
        const problem = scoreProblem(text, column.max)

        setTexts((current) => new Map(current).set(key, text))
        setProblems((current) => {
            const next = new Map(current)
            if (problem) next.set(key, problem)
            else next.delete(key)
            return next
        })

        // A score that can't be saved cancels any save still waiting.
        session.edit(key, {
            kind: key,
            studentId: row.student_id,
            value: problem ? savedValue : scoreValue(text),
            savedValue,
        })
    }

    function forget(key) {
        setTexts((current) => {
            const next = new Map(current)
            next.delete(key)
            return next
        })
    }

    function undo(row, key) {
        const savedValue = saved.get(key) ?? null

        forget(key)
        setProblems((current) => {
            const next = new Map(current)
            next.delete(key)
            return next
        })
        session.edit(key, { kind: key, studentId: row.student_id, value: savedValue, savedValue })
    }

    function commit(key) {
        if (entries.get(key)?.status === 'error') session.retry(key)
        else session.flush(key)

        if (!problems.has(key)) forget(key)
    }

    function move(event, rowIndex, columnIndex, row, key) {
        if (event.nativeEvent.isComposing) return

        const input = event.currentTarget
        let rowStep = 0
        let columnStep = 0

        if (event.key === 'Enter') rowStep = event.shiftKey ? -1 : 1
        else if (event.key === 'ArrowDown') rowStep = 1
        else if (event.key === 'ArrowUp') rowStep = -1
        else if (event.key === 'ArrowRight' && input.selectionEnd === input.value.length) columnStep = 1
        else if (event.key === 'ArrowLeft' && input.selectionStart === 0) columnStep = -1
        else if (event.key === 'Escape') {
            event.preventDefault()
            undo(row, key)
            return
        } else return

        event.preventDefault()
        commit(key)

        const target = inputs.current.get(`${rowIndex + rowStep}:${columnIndex + columnStep}`)
        target?.focus()
        target?.select()
    }

    if (query.isPending) return <GridSkeleton />

    if (query.isError && !query.data) {
        return (
            <div role="alert" className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-10 text-center">
                <p className="font-medium">The gradebook couldn’t load</p>
                <p className="text-sm text-muted-foreground">
                    {query.error?.response?.data?.message || 'Check your connection, then try again.'}
                </p>
                <Button type="button" variant="outline" disabled={query.isFetching} onClick={() => query.refetch()}>
                    {query.isFetching ? 'Trying again…' : 'Try again'}
                </Button>
            </div>
        )
    }

    const values = [...entries.values()]
    const saving = values.filter((entry) => entry.dirty).length
    const failed = values.filter((entry) => entry.status === 'error').length

    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <IconInput
                    icon={Search}
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search students…"
                    aria-label="Search students"
                    className="w-full sm:w-72"
                />

                <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground" aria-live="polite">
                    <span className="inline-flex items-center gap-1">
                        {saving > 0 && <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />}
                        {saving > 0 ? `Saving ${saving} change${saving === 1 ? '' : 's'}…` : 'All changes saved'}
                    </span>
                    {failed > 0 && (
                        <button type="button" onClick={session.retryAll} className="inline-flex items-center gap-1 text-destructive underline underline-offset-2">
                            <RotateCcw className="size-3.5" aria-hidden="true" />
                            Retry {failed} unsaved
                        </button>
                    )}
                    {problems.size > 0 && (
                        <span className="text-destructive">
                            {problems.size} score{problems.size === 1 ? '' : 's'} to fix
                        </span>
                    )}
                </p>
            </div>

            {navigationMessage && saving > 0 && (
                <p className="text-sm text-muted-foreground">{navigationMessage}</p>
            )}

            {summary.issues.length > 0 && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-200">
                    <p className="font-medium">Term grades appear once the setup is complete:</p>
                    <ul className="mt-1 list-disc pl-5">
                        {summary.issues.map((issue) => <li key={issue}>{issue}</li>)}
                    </ul>
                </div>
            )}

            {columns.length === 0 ? (
                <div className="rounded-xl border border-dashed px-6 py-10 text-center text-sm text-muted-foreground">
                    No assessments for the {periodLabel.toLowerCase()} yet. Add one under By assessment, or set up categories with Manage.
                </div>
            ) : rows.length === 0 ? (
                <div className="rounded-xl border border-dashed px-6 py-10 text-center text-sm text-muted-foreground">
                    {summary.rows.length ? 'No students match your search.' : 'No students in this class yet.'}
                </div>
            ) : (
                <div className="max-h-[70vh] overflow-auto rounded-xl border bg-card">
                    <table className="w-max min-w-full border-separate border-spacing-0 text-sm">
                        <caption className="sr-only">{periodLabel} scores by student</caption>
                        <thead>
                            <tr>
                                <th rowSpan={2} scope="col" className="sticky left-0 top-0 z-30 min-w-[8.5rem] border-b border-r bg-muted px-3 text-left font-medium sm:min-w-[13rem]">
                                    Student
                                </th>
                                {groups.map((category) => (
                                    <th key={category.id} colSpan={category.assessments.length} scope="colgroup"
                                        title={`${category.name}: ${category.weight}% of class standing`}
                                        className="sticky top-0 z-20 h-8 border-b border-r bg-muted px-3 text-left text-xs font-semibold">
                                        <span className="block max-w-[16rem] truncate">
                                            {category.name}
                                            <span className="font-normal text-muted-foreground"> · {category.weight}%</span>
                                        </span>
                                    </th>
                                ))}
                                {summary.exam && (
                                    <th scope="col" className="sticky top-0 z-20 h-8 border-b border-r bg-muted px-3 text-left text-xs font-semibold">
                                        Exam
                                    </th>
                                )}
                                <th rowSpan={2} scope="col" className="sticky top-0 z-20 min-w-[7rem] border-b bg-muted px-3 text-left font-medium">
                                    Term grade
                                </th>
                            </tr>
                            <tr>
                                {columns.map((column) => (
                                    <th key={`${column.type}:${column.id}`} scope="col" className="sticky top-8 z-20 border-b border-r bg-muted px-2 py-1 text-center font-normal">
                                        <button
                                            type="button"
                                            onClick={() => (column.type === 'e' ? onOpenExam() : onOpenAssessment(column.categoryId, column.id))}
                                            title={`${column.name}: open it to rename, change the maximum or delete it`}
                                            className="mx-auto block max-w-[7rem] truncate rounded text-xs font-medium hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                        >
                                            {column.name}
                                        </button>
                                        <span className="block text-[11px] tabular-nums text-muted-foreground">/{column.max}</span>
                                    </th>
                                ))}
                            </tr>
                        </thead>

                        <tbody>
                            {rows.map((row, rowIndex) => (
                                <tr key={row.student_subject_id} className="group">
                                    <th scope="row" className="sticky left-0 z-10 max-w-[9rem] border-b border-r bg-card px-3 py-1.5 text-left font-normal group-hover:bg-muted sm:max-w-[15rem]">
                                        <span className="block truncate font-medium" title={row.name}>{row.name}</span>
                                        {row.user_id_no && <span className="block text-xs text-muted-foreground">{row.user_id_no}</span>}
                                    </th>

                                    {columns.map((column, columnIndex) => {
                                        const key = cellKey(column.type, column.id, Number(row.student_subject_id))
                                        const entry = entries.get(key)
                                        const problem = problems.get(key)
                                        const failedSave = entry?.status === 'error'

                                        return (
                                            <td key={key} className="border-b border-r px-1.5 py-1 text-center align-top group-hover:bg-muted/40">
                                                <input
                                                    ref={(element) => {
                                                        const slot = `${rowIndex}:${columnIndex}`
                                                        if (element) inputs.current.set(slot, element)
                                                        else inputs.current.delete(slot)
                                                    }}
                                                    value={display(key)}
                                                    inputMode="numeric"
                                                    autoComplete="off"
                                                    aria-label={`${column.name} score for ${row.name}, out of ${column.max}`}
                                                    aria-invalid={Boolean(problem || failedSave)}
                                                    title={problem
                                                        ? `${problem}, so it isn’t saved`
                                                        : failedSave ? `Not saved: ${entry.error} Press Enter to retry.` : undefined}
                                                    onChange={(event) => change(column, row, key, event.target.value)}
                                                    onFocus={(event) => event.target.select()}
                                                    onBlur={() => commit(key)}
                                                    onKeyDown={(event) => move(event, rowIndex, columnIndex, row, key)}
                                                    className={cn(
                                                        'h-8 w-14 rounded-md border border-transparent bg-transparent text-center tabular-nums outline-none transition-colors',
                                                        'hover:border-border focus:border-primary focus:bg-background focus:ring-2 focus:ring-ring/30',
                                                        (entry?.dirty || entry?.inFlight) && !problem && 'border-primary/40',
                                                        (problem || failedSave) && 'border-destructive bg-destructive/10 text-destructive'
                                                    )}
                                                />
                                                {problem && (
                                                    <span className="block whitespace-nowrap text-[10px] leading-3 text-destructive">{problem}</span>
                                                )}
                                                {failedSave && !problem && (
                                                    <span className="block whitespace-nowrap text-[10px] leading-3 text-destructive">Not saved</span>
                                                )}
                                            </td>
                                        )
                                    })}

                                    <td className="whitespace-nowrap border-b px-3 py-1.5 align-middle group-hover:bg-muted/40">
                                        <TermResult row={row} />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {emptyCategories.length > 0 && columns.length > 0 && (
                <p className="text-xs text-muted-foreground">
                    No assessments yet in {emptyCategories.map((category) => category.name).join(', ')}.
                </p>
            )}

            <p className="text-xs text-muted-foreground">
                Enter or ↓ moves down, ← → move across, Esc undoes a change. Click a column name to rename it,
                change its maximum or delete it.
            </p>
        </div>
    )
}
