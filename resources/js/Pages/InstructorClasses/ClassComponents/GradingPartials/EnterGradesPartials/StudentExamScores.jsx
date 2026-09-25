import { useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import {
    Check,
    Clock3,
    LoaderCircle,
    RotateCcw,
    Search,
} from 'lucide-react'

import { Card, CardContent } from '@/Components/ui/card'
import { Input } from '@/Components/ui/input'
import NumberInput from '@/Components/ui/NumberInput'
import { Button } from '@/Components/ui/button'
import { Progress } from '@/Components/ui/progress'
import { Skeleton } from '@/Components/ui/skeleton'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/Components/ui/table'

import { formatName } from '@/Lib/InfoUtils'
import { useExamScoreAutosave } from './useExamScoreAutosave'

const EMPTY = []

const hasScore = (score) =>
    score !== null && score !== undefined && score !== ''

function ScoreStatus({ status, error, onRetry }) {
    if (status === 'error') {
        return (
            <button
                type="button"
                onClick={onRetry}
                title={error}
                className="inline-flex items-center gap-1 text-xs text-destructive underline"
            >
                <RotateCcw className="size-3.5" />
                Retry
            </button>
        )
    }

    const states = {
        unsaved: [Clock3, 'Unsaved', 'text-muted-foreground'],
        saving: [LoaderCircle, 'Saving…', 'text-muted-foreground'],
        saved: [Check, 'Saved', 'text-green-600'],
    }

    if (!states[status]) return null

    const [Icon, label, color] = states[status]

    return (
        <span
            role="status"
            className={`inline-flex items-center gap-1 text-xs ${color}`}
        >
            <Icon
                aria-hidden="true"
                className={`size-3.5 ${status === 'saving' ? 'animate-spin' : ''
                    }`}
            />
            {label}
        </span>
    )
}

export default function StudentExamScores({ exam, classId }) {
    const [search, setSearch] = useState('')
    const [onlyUngraded, setOnlyUngraded] = useState(false)
    const [focusedId, setFocusedId] = useState(null)

    const inputRefs = useRef(new Map())
    const autosave = useExamScoreAutosave(classId, exam.id)

    const maxScore = Number(exam.max_score)
    const hasValidMaximum =
        Number.isSafeInteger(maxScore) && maxScore > 0

    const studentsQuery = useQuery({
        queryKey: ['class.students', classId],
        staleTime: 10 * 60 * 1000,
        queryFn: async ({ signal }) => {
            const { data } = await axios.post(
                route('class.students', { id: classId }),
                undefined,
                { signal }
            )

            if (!Array.isArray(data)) {
                throw new Error(
                    'The students endpoint must return an array.'
                )
            }

            return data
        },
    })

    const scoresQuery = useQuery({
        queryKey: ['exam-scores', exam.id],
        queryFn: async ({ signal }) => {
            const { data } = await axios.get(
                route('exam-scores.index', { id: exam.id }),
                { signal }
            )

            if (!Array.isArray(data)) {
                throw new Error(
                    'The exam scores endpoint must return an array.'
                )
            }

            return data
        },
    })

    const students = studentsQuery.data ?? EMPTY
    const scores = scoresQuery.data ?? EMPTY

    const savedByStudent = useMemo(
        () =>
            new Map(
                scores.map((row) => [
                    String(row.student_id),
                    row.score === null ? null : Number(row.score),
                ])
            ),
        [scores]
    )

    const rows = useMemo(
        () =>
            students
                .filter(
                    (student) => Number(student.dropped ?? 0) === 0
                )
                .map((student) => {
                    const key = String(student.id)
                    const entry = autosave.entries.get(key)
                    const saved = savedByStudent.get(key) ?? null

                    return {
                        ...student,
                        key,
                        name: formatName(student, { format: 'LFM' }),
                        value: entry?.dirty ? entry.value : saved,
                        entry,
                    }
                }),
        [students, savedByStudent, autosave.entries]
    )

    const visible = rows.filter((row) => {
        const matchesSearch =
            `${row.name} ${row.user_id_no ?? ''}`
                .toLowerCase()
                .includes(search.trim().toLowerCase())

        // Keep the current or unsaved row visible while editing.
        const matchesStatus =
            !onlyUngraded ||
            !hasScore(row.value) ||
            row.key === focusedId ||
            row.entry?.dirty

        return matchesSearch && matchesStatus
    })

    const graded = rows.filter((row) =>
        hasScore(savedByStudent.get(row.key))
    ).length

    function changeScore(row, nextValue) {
        autosave.edit(
            row.id,
            nextValue === '' ? null : nextValue,
            savedByStudent.get(row.key) ?? null
        )
    }

    function handleKey(event, index) {
        if (event.nativeEvent.isComposing) return

        const direction = {
            Enter: event.shiftKey ? -1 : 1,
            ArrowDown: 1,
            ArrowUp: -1,
        }[event.key]

        if (direction === undefined) return

        event.preventDefault()
        autosave.flush(visible[index].id)

        const next = visible[index + direction]
        const input = next && inputRefs.current.get(next.key)

        input?.focus()
        input?.select()
    }

    if (studentsQuery.isLoading || scoresQuery.isLoading) {
        return (
            <Card>
                <CardContent className="space-y-4 p-4">
                    {Array.from({ length: 6 }, (_, index) => (
                        <Skeleton
                            key={index}
                            className="h-8 w-full"
                        />
                    ))}
                </CardContent>
            </Card>
        )
    }

    const initialLoadFailed =
        (studentsQuery.isError && !studentsQuery.data) ||
        (scoresQuery.isError && !scoresQuery.data)

    if (initialLoadFailed) {
        return (
            <Card>
                <CardContent className="space-y-3 p-4">
                    <p
                        role="alert"
                        className="text-sm text-destructive"
                    >
                        Unable to load exam scores.
                    </p>

                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                            void studentsQuery.refetch()
                            void scoresQuery.refetch()
                        }}
                    >
                        Retry
                    </Button>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-4">
            <Card className="bg-secondary/30">
                <CardContent className="flex flex-wrap items-center justify-between gap-4 p-3">
                    <div>
                        <p className="font-medium">
                            {exam.name || `${exam.period} Exam`}
                        </p>

                        <p className="text-xs text-muted-foreground">
                            Maximum score:{' '}
                            {hasValidMaximum ? maxScore : 'Not set'}{' '}
                            points · 30% of the term grade
                        </p>
                    </div>

                    <div className="w-40">
                        <p className="mb-1 text-xs text-muted-foreground">
                            {graded}/{rows.length} graded
                        </p>

                        <Progress
                            value={
                                rows.length
                                    ? (graded / rows.length) * 100
                                    : 0
                            }
                            aria-label="Exam grading progress"
                        />
                    </div>
                </CardContent>
            </Card>

            {!hasValidMaximum && (
                <p role="alert" className="text-sm text-destructive">
                    Set the exam maximum score in Grading Settings
                    before entering scores.
                </p>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
                <label className="flex items-center gap-2">
                    <Input
                        value={search}
                        onChange={(event) =>
                            setSearch(event.target.value)
                        }
                        placeholder="Search students…"
                        aria-label="Search exam students"
                        className="sm:w-80"
                    />
                </label>

                <label className="flex items-center gap-2 text-sm">
                    <input
                        type="checkbox"
                        checked={onlyUngraded}
                        onChange={(event) =>
                            setOnlyUngraded(event.target.checked)
                        }
                    />
                    Show only ungraded
                </label>
            </div>

            <div
                aria-live="polite"
                className="flex items-center justify-between gap-3 text-xs text-muted-foreground"
            >
                <span>
                    {autosave.pendingCount
                        ? `${autosave.pendingCount} change(s) not yet saved`
                        : 'All changes saved'}
                </span>

                {autosave.errorCount > 0 && (
                    <button
                        type="button"
                        onClick={autosave.retryAll}
                        className="text-destructive underline"
                    >
                        Retry {autosave.errorCount} failed save(s)
                    </button>
                )}
            </div>

            {autosave.navigationMessage && (
                <p className="text-sm text-muted-foreground">
                    {autosave.navigationMessage}
                </p>
            )}

            <p className="text-xs text-muted-foreground">
                Enter or ↓ moves down; ↑ moves up.
                Clear a score to mark it ungraded.
            </p>

            <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-12">#</TableHead>
                            <TableHead>Student</TableHead>
                            <TableHead>Exam score</TableHead>
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        {visible.map((row, index) => (
                            <TableRow key={row.key}>
                                <TableCell>{index + 1}.</TableCell>

                                <TableCell>
                                    <p>{row.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {row.user_id_no}
                                    </p>
                                </TableCell>

                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <NumberInput
                                            ref={(element) => {
                                                if (element) {
                                                    inputRefs.current.set(
                                                        row.key,
                                                        element
                                                    )
                                                } else {
                                                    inputRefs.current.delete(
                                                        row.key
                                                    )
                                                }
                                            }}
                                            value={row.value ?? ''}
                                            min={0}
                                            max={
                                                hasValidMaximum
                                                    ? maxScore
                                                    : undefined
                                            }
                                            step={1}
                                            disabled={!hasValidMaximum}
                                            className="w-24 shrink-0"
                                            aria-label={`Exam score for ${row.name}`}
                                            aria-invalid={
                                                row.entry?.status ===
                                                'error'
                                            }
                                            onValueChange={(value) =>
                                                changeScore(row, value)
                                            }
                                            onFocus={() =>
                                                setFocusedId(row.key)
                                            }
                                            onBlur={() => {
                                                autosave.flush(row.id)
                                                setFocusedId(null)
                                            }}
                                            onKeyDown={(event) =>
                                                handleKey(event, index)
                                            }
                                        />

                                        <span className="text-sm text-muted-foreground">
                                            /
                                            {hasValidMaximum
                                                ? maxScore
                                                : '—'}
                                        </span>

                                        <ScoreStatus
                                            status={
                                                row.entry?.status ??
                                                (hasScore(row.value)
                                                    ? 'saved'
                                                    : 'idle')
                                            }
                                            error={row.entry?.error}
                                            onRetry={() =>
                                                autosave.retry(row.id)
                                            }
                                        />
                                    </div>

                                    {row.entry?.error && (
                                        <p
                                            role="alert"
                                            className="mt-1 text-xs text-destructive"
                                        >
                                            {row.entry.error}
                                        </p>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}

                        {!visible.length && (
                            <TableRow>
                                <TableCell
                                    colSpan={3}
                                    className="h-24 text-center text-muted-foreground"
                                >
                                    No students found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </Card>
        </div>
    )
}