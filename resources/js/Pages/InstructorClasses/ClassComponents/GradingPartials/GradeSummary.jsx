import React, {
    useEffect,
    useId,
    useMemo,
    useRef,
    useState,
} from 'react'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import {
    ChevronDown,
    Download,
    FileText,
    GraduationCap,
    LoaderCircle,
    RefreshCw,
    Search,
} from 'lucide-react'

import { Button } from '@/Components/ui/button'
import { Input } from '@/Components/ui/input'
import StudentGradeBreakdown from './StudentGradeBreakdown'
import {
    buildGradeSummary,
    getGradeStatus,
    matchesGradeStatus,
    CLASS_STANDING_WEIGHT,
    EXAM_WEIGHT,
} from './gradeCalculations'

const labels = {
    passed: 'Passed',
    failed: 'Failed',
    incomplete: 'Incomplete',
    configuration: 'Check settings',
    invalid: 'Check scores',
}

const gradeTones = {
    passed:
        'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
    failed:
        'bg-rose-500/15 text-rose-700 dark:text-rose-400',
    incomplete:
        'bg-muted text-muted-foreground',
}

export const gradeSummaryKey = classId => [
    'grade-summary',
    String(classId),
]

function TermSummaryCard({
    label,
    totals,
    isFinal = false,
}) {
    const Icon = isFinal ? GraduationCap : FileText

    const stats = [
        {
            label: 'Passed',
            value: totals.passed,
            hint: '≤ 3.0',
            tone: 'text-emerald-600 dark:text-emerald-400',
        },
        {
            label: 'Failed',
            value: totals.failed,
            hint: '> 3.0',
            tone: 'text-rose-600 dark:text-rose-400',
        },
        {
            label: 'Pending',
            value: totals.pending,
            hint: 'No grade yet',
            tone: 'text-amber-600 dark:text-amber-300',
        },
    ]

    return (
        <div
            className={`grid gap-4 rounded-xl border border-border/70 p-4 sm:grid-cols-[minmax(8.5rem,1.6fr)_3fr] ${isFinal
                    ? 'bg-violet-50/70 dark:bg-[#1b1a2b]'
                    : 'bg-blue-50/70 dark:bg-[#111b2a]'
                }`}
        >
            <div className="flex items-center gap-3">
                <div
                    className={`flex size-14 shrink-0 items-center justify-center rounded-full ${isFinal
                            ? 'bg-violet-500/15 text-violet-600 dark:bg-violet-500/25 dark:text-violet-300'
                            : 'bg-blue-500/15 text-blue-600 dark:bg-blue-500/25 dark:text-blue-300'
                        }`}
                >
                    <Icon
                        className="size-7"
                        strokeWidth={1.5}
                        aria-hidden="true"
                    />
                </div>

                <div>
                    <h3 className="font-semibold">
                        {label}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {totals.students} students
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-3 divide-x divide-border/70 border-t border-border/70 pt-4 sm:border-l sm:border-t-0 sm:pt-0">
                {stats.map(stat => (
                    <div
                        key={stat.label}
                        className="flex flex-col justify-center px-2 text-center"
                    >
                        <p
                            className={`text-2xl font-semibold tabular-nums ${stat.tone}`}
                        >
                            {stat.value}
                        </p>
                        <p className="mt-0.5 text-sm">
                            {stat.label}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                            {stat.hint}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    )
}

function Grade({ result, label }) {
    const status = getGradeStatus(result?.equivalent)
    const hasGrade = status !== 'incomplete'

    const statusLabel = hasGrade
        ? labels[status]
        : labels[result?.status] ?? 'Incomplete'

    return (
        <div className="flex flex-wrap items-center gap-2">
            <span className="sr-only">{label}: </span>

            <span
                className={`inline-flex h-9 min-w-14 items-center justify-center rounded-md px-3 text-lg font-semibold tabular-nums ${gradeTones[status]}`}
            >
                {hasGrade
                    ? Number(result.equivalent).toFixed(1)
                    : '—'}
            </span>

            <span
                className={`inline-flex min-h-8 items-center justify-center rounded-md px-3 py-1 text-xs font-medium ${gradeTones[status]}`}
            >
                {statusLabel}
            </span>
        </div>
    )
}

function StudentRow({
    student,
    index,
    summaries,
}) {
    const [open, setOpen] = useState(false)
    const panelId = useId()

    return (
        <>
            <tr
                className={`grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] gap-3 border-b border-border/60 p-3 transition-colors hover:bg-muted/30 md:table-row md:p-0 ${open ? 'bg-muted/20' : ''
                    }`}
            >
                <td className="hidden px-4 py-3 text-muted-foreground tabular-nums md:table-cell">
                    {index + 1}
                </td>

                <th
                    scope="row"
                    className="col-span-2 min-w-0 text-left font-normal md:border-r md:border-border/50 md:px-4 md:py-3"
                >
                    <p className="break-words font-medium">
                        {student.name}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                        {student.user_id_no ??
                            `User ${student.student_id}`}
                    </p>
                </th>

                <td className="col-start-1 row-start-2 md:border-r md:border-border/50 md:px-5 md:py-3">
                    <p className="mb-1 text-xs text-muted-foreground md:hidden">
                        Midterm
                    </p>
                    <Grade
                        result={student.midterm}
                        label="Midterm"
                    />
                </td>

                <td className="col-start-2 row-start-2 md:border-r md:border-border/50 md:px-5 md:py-3">
                    <p className="mb-1 text-xs text-muted-foreground md:hidden">
                        Final
                    </p>
                    <Grade
                        result={student.final}
                        label="Final"
                    />
                </td>

                <td className="col-start-3 row-start-1 text-center md:px-3 md:py-3">
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-9"
                        aria-expanded={open}
                        aria-controls={panelId}
                        aria-label={`${open ? 'Hide' : 'Show'} grade details for ${student.name}`}
                        onClick={() => setOpen(value => !value)}
                    >
                        <ChevronDown
                            className={`size-5 transition-transform ${open ? 'rotate-180' : ''
                                }`}
                            aria-hidden="true"
                        />
                    </Button>
                </td>
            </tr>

            <tr className={open ? 'block md:table-row' : 'hidden'}>
                <td
                    colSpan={5}
                    className="block min-w-0 border-b border-border/60 bg-muted/10 p-2 md:table-cell md:p-3"
                >
                    <div
                        id={panelId}
                        role="region"
                        aria-label={`Grade details for ${student.name}`}
                    >
                        {open && (
                            <StudentGradeBreakdown
                                student={student}
                                summaries={summaries}
                            />
                        )}
                    </div>
                </td>
            </tr>
        </>
    )
}

function DownloadGradesButton({
    classId,
    summaries,
    disabled,
}) {
    const [exporting, setExporting] = useState(false)
    const [exportError, setExportError] = useState('')

    const downloadingRef = useRef(false)
    const mountedRef = useRef(false)

    useEffect(() => {
        mountedRef.current = true

        return () => {
            mountedRef.current = false
        }
    }, [])

    async function handleDownload() {
        if (
            disabled ||
            downloadingRef.current ||
            !summaries.students.length
        ) {
            return
        }

        downloadingRef.current = true
        setExporting(true)
        setExportError('')

        try {
            // Load SheetJS only when the user requests a download.
            const { downloadGradeSummary } = await import(
                './exportGradeSummary'
            )

            if (!mountedRef.current) return

            downloadGradeSummary({
                summaries,
                classId,
            })
        } catch (error) {
            console.error(
                'Unable to export grade summary:',
                error
            )

            if (mountedRef.current) {
                setExportError(
                    'Unable to download grades. Please try again.'
                )
            }
        } finally {
            downloadingRef.current = false

            if (mountedRef.current) {
                setExporting(false)
            }
        }
    }

    return (
        <>
            <Button
                type="button"
                disabled={
                    disabled ||
                    exporting ||
                    !summaries.students.length
                }
                onClick={() => void handleDownload()}
                aria-busy={exporting}
                title={`Download all ${summaries.students.length} active students with Midterm and Final details`}
                className="h-11 w-full gap-2 sm:w-auto"
            >
                {exporting ? (
                    <LoaderCircle
                        className="size-4 animate-spin"
                        aria-hidden="true"
                    />
                ) : (
                    <Download
                        className="size-4"
                        aria-hidden="true"
                    />
                )}

                {exporting
                    ? 'Preparing Excel…'
                    : 'Download Excel'}
            </Button>

            {exportError && (
                <p
                    role="alert"
                    className="w-full text-sm text-destructive"
                >
                    {exportError}
                </p>
            )}
        </>
    )
}

export default function GradeSummary({ classId }) {
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('all')

    const hasClass =
        classId !== null &&
        classId !== undefined &&
        classId !== ''

    const {
        data,
        isPending,
        isFetching,
        isError,
        error,
        refetch,
    } = useQuery({
        queryKey: gradeSummaryKey(classId),
        enabled: hasClass,
        queryFn: async ({ signal }) => {
            const response = await axios.get(
                route('grade-summary.show', { classId }),
                {
                    signal,
                    headers: {
                        Accept: 'application/json',
                    },
                }
            )

            return response.data
        },
        staleTime: 0,
        refetchOnMount: 'always',
        refetchOnWindowFocus: true,
        retry: (count, requestError) =>
            count < 1 &&
            (
                !requestError.response?.status ||
                requestError.response.status >= 500
            ),
    })

    const summaries = useMemo(() => {
        const midterm = buildGradeSummary(data, 'midterm')
        const final = buildGradeSummary(data, 'final')

        const finalByStudent = new Map(
            final.rows.map(row => [
                String(row.student_subject_id),
                row,
            ])
        )

        const students = midterm.rows.map(row => ({
            ...row,
            midterm: row,
            final: finalByStudent.get(
                String(row.student_subject_id)
            ),
        }))

        return {
            midterm,
            final,
            students,
        }
    }, [data])

    const students = useMemo(() => {
        const query = search.trim().toLowerCase()

        return summaries.students.filter(student => {
            const matchesSearch =
                `${student.name} ${student.user_id_no ?? ''}`
                    .toLowerCase()
                    .includes(query)

            return (
                matchesSearch &&
                matchesGradeStatus(student, statusFilter)
            )
        })
    }, [summaries.students, search, statusFilter])

    if (!hasClass) {
        return (
            <p className="p-6 text-muted-foreground">
                Select a class to view its grades.
            </p>
        )
    }

    return (
        <section
            className="min-w-0 space-y-5 text-foreground"
            aria-label="Grade summary"
            aria-busy={isFetching}
        >
            <div>
                <h2 className="text-2xl font-semibold tracking-tight">
                    Grade Summary
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                    Class Standing {CLASS_STANDING_WEIGHT}% · Exam{' '}
                    {EXAM_WEIGHT}%
                </p>
            </div>

            {isError && (
                <div
                    role="alert"
                    className="rounded-lg border border-destructive/40 p-3 text-sm text-destructive"
                >
                    {error.response?.data?.message ||
                        'Unable to load grades. Please try Refresh.'}

                    {data && (
                        <p>
                            Showing previously loaded grades;
                            recent changes may be missing.
                        </p>
                    )}

                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        disabled={isFetching}
                        onClick={() => void refetch()}
                    >
                        Retry
                    </Button>
                </div>
            )}

            {isPending && !data ? (
                <div
                    role="status"
                    className="flex justify-center gap-2 py-12 text-muted-foreground"
                >
                    <LoaderCircle
                        className="size-5 animate-spin"
                        aria-hidden="true"
                    />
                    Loading grades…
                </div>
            ) : data ? (
                <>
                    <div className="grid gap-4 xl:grid-cols-2">
                        <TermSummaryCard
                            label="Midterm"
                            totals={summaries.midterm.totals}
                        />

                        <TermSummaryCard
                            label="Final"
                            totals={summaries.final.totals}
                            isFinal
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative w-full sm:max-w-md">
                            <Search
                                className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground"
                                aria-hidden="true"
                            />

                            <Input
                                value={search}
                                onChange={event =>
                                    setSearch(event.target.value)
                                }
                                placeholder="Search student name or ID…"
                                aria-label="Search students"
                                className="h-11 bg-background pl-10"
                            />
                        </div>

                        <div className="relative w-full sm:w-48">
                            <select
                                value={statusFilter}
                                onChange={event =>
                                    setStatusFilter(
                                        event.target.value
                                    )
                                }
                                aria-label="Filter by grade status in either term"
                                className="h-11 w-full appearance-none rounded-md border border-input bg-background pl-3 pr-9 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                <option value="all">
                                    All Status
                                </option>
                                <option value="passed">
                                    Passed in either term
                                </option>
                                <option value="failed">
                                    Failed in either term
                                </option>
                                <option value="pending">
                                    Pending in either term
                                </option>
                            </select>

                            <ChevronDown
                                className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                                aria-hidden="true"
                            />
                        </div>

                        <div className="flex w-full flex-wrap gap-2 sm:ml-auto sm:w-auto">
                            <Button
                                type="button"
                                variant="outline"
                                disabled={isFetching}
                                onClick={() => void refetch()}
                                className="h-11 w-full gap-2 sm:w-auto"
                            >
                                <RefreshCw
                                    className={`size-4 ${isFetching
                                            ? 'animate-spin'
                                            : ''
                                        }`}
                                    aria-hidden="true"
                                />
                                Refresh
                            </Button>

                            <DownloadGradesButton
                                key={String(classId)}
                                classId={classId}
                                summaries={summaries}
                                disabled={isFetching || isError}
                            />
                        </div>
                    </div>

                    <div className="overflow-hidden rounded-xl border border-border/70 bg-background">
                        <div className="overflow-x-auto">
                            <table className="block w-full border-collapse text-sm md:table">
                                <caption className="sr-only">
                                    Student Midterm and Final grade
                                    equivalents. Use the Actions button
                                    to expand assessment details.
                                </caption>

                                <colgroup className="hidden md:table-column-group">
                                    <col className="w-12" />
                                    <col className="w-[36%]" />
                                    <col className="w-[24%]" />
                                    <col className="w-[24%]" />
                                    <col className="w-24" />
                                </colgroup>

                                <thead className="hidden border-b border-border/70 bg-muted/50 text-left text-muted-foreground md:table-header-group">
                                    <tr>
                                        <th
                                            scope="col"
                                            className="px-4 py-3 font-medium"
                                        >
                                            #
                                        </th>
                                        <th
                                            scope="col"
                                            className="border-r border-border/50 px-4 py-3 font-medium"
                                        >
                                            Student
                                        </th>
                                        <th
                                            scope="col"
                                            className="border-r border-border/50 px-5 py-3 font-medium"
                                        >
                                            Midterm
                                        </th>
                                        <th
                                            scope="col"
                                            className="border-r border-border/50 px-5 py-3 font-medium"
                                        >
                                            Final
                                        </th>
                                        <th
                                            scope="col"
                                            className="px-3 py-3 text-center font-medium"
                                        >
                                            Actions
                                        </th>
                                    </tr>
                                </thead>

                                <tbody className="block md:table-row-group">
                                    {students.map((student, index) => (
                                        <StudentRow
                                            key={`${classId}:${student.student_subject_id}`}
                                            student={student}
                                            index={index}
                                            summaries={summaries}
                                        />
                                    ))}

                                    {!students.length && (
                                        <tr>
                                            <td
                                                colSpan={5}
                                                className="p-8 text-center text-muted-foreground"
                                            >
                                                {summaries.students.length
                                                    ? 'No students match your search and status filter.'
                                                    : 'No active students are enrolled in this class.'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <p className="text-xs text-muted-foreground">
                        Showing {students.length} of{' '}
                        {summaries.students.length} students.
                        Expand a row to view assessment scores
                        and calculations. Excel downloads include
                        all {summaries.students.length} active students.
                    </p>
                </>
            ) : null}
        </section>
    )
}