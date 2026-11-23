import React, { useMemo, useState } from 'react'
import axios from 'axios'
import { Head, Link, router } from '@inertiajs/react'
import { useQuery } from '@tanstack/react-query'
import { ChevronRight, Search } from 'lucide-react'

import SchoolYearPicker from '@/Components/SchoolYearPicker'
import { Button } from '@/Components/ui/button'
import { Input } from '@/Components/ui/input'
import { Skeleton } from '@/Components/ui/skeleton'
import { useSchoolYearStore } from '@/Components/useSchoolYearStore'
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout'
import { cn } from '@/Lib/Utils'
import GradeUploadPanel, { useGradeUpload } from './GradeUploadPanel'

const PERIODS = [
    { value: 'midterm', label: 'Midterm' },
    { value: 'final', label: 'Final' },
]

// Counts are classes; picking one shows the teachers with any.
const FILTERS = [
    { value: 'not_submitted', label: 'Not submitted' },
    { value: 'submitted', label: 'Submitted' },
    { value: 'ready', label: 'Ready to deploy' },
    { value: 'deployed', label: 'Deployed' },
    { value: 'late', label: 'Late' },
]

// The period to show first: whichever upload is open, else the latest one.
function defaultPeriod(windows) {
    if (windows?.final?.status === 'open') return 'final'
    if (windows?.midterm?.status === 'open') return 'midterm'
    if (windows?.final?.status === 'closed') return 'final'
    return 'midterm'
}

function readParam(name, allowed) {
    const value = new URLSearchParams(window.location.search).get(name)
    return allowed.includes(value) ? value : null
}

// Keep the period and filter in the URL, so Back returns to them.
function writeParam(name, value) {
    const url = new URL(window.location.href)
    value ? url.searchParams.set(name, value) : url.searchParams.delete(name)
    window.history.replaceState(window.history.state, '', url)
}

function Count({ value, tone }) {
    return value > 0
        ? <span className={cn('tabular-nums', tone)}>{value}</span>
        : <span className="text-muted-foreground/60">—</span>
}

function ListSkeleton() {
    return (
        <div role="status" aria-label="Loading teachers" className="space-y-2 p-4">
            {[0, 1, 2, 3, 4].map((index) => <Skeleton key={index} className="h-11 w-full rounded-lg" />)}
        </div>
    )
}

function VerifiedGrades() {
    const { selectedSchoolYearEntry: schoolYear } = useSchoolYearStore()
    const [chosenPeriod, setChosenPeriod] = useState(() => readParam('period', ['midterm', 'final']))
    const [filter, setFilterState] = useState(() => readParam('show', FILTERS.map((entry) => entry.value)))
    const [search, setSearch] = useState('')

    const upload = useGradeUpload(schoolYear?.id)
    const period = chosenPeriod ?? defaultPeriod(upload.data?.periods)

    const overview = useQuery({
        queryKey: ['grade-submission-overview', schoolYear?.id],
        queryFn: async ({ signal }) => (await axios.get(`/grade-submission-overview/${schoolYear.id}`, { signal })).data,
        enabled: Boolean(schoolYear?.id),
    })

    function setPeriod(value) {
        setChosenPeriod(value)
        writeParam('period', value)
    }

    function setFilter(value) {
        setFilterState(value)
        writeParam('show', value)
    }

    const teachers = overview.data?.teachers ?? []

    const totals = useMemo(() => {
        const sums = Object.fromEntries(FILTERS.map(({ value }) => [value, 0]))
        teachers.forEach((teacher) => FILTERS.forEach(({ value }) => { sums[value] += teacher[period][value] }))
        return sums
    }, [teachers, period])

    const rows = useMemo(() => {
        const term = search.trim().toLowerCase()
        // Most of the chosen kind first; otherwise most ready to deploy first.
        const key = filter ?? 'ready'

        return teachers
            .filter((teacher) => !filter || teacher[period][filter] > 0)
            .filter((teacher) => !term || teacher.name.toLowerCase().includes(term) || String(teacher.user_id_no).toLowerCase().includes(term))
            .sort((a, b) => b[period][key] - a[period][key] || a.name.localeCompare(b.name))
    }, [teachers, period, filter, search])

    const subjectsHref = (teacher) => route('verified.faculty.subjects', {
        schoolYear: `${schoolYear.start_year}-${schoolYear.end_year}`,
        semester: schoolYear.semester.semester_name,
        facultyId: teacher.user_id_no,
    })

    return (
        <div className="flex flex-col gap-4 lg:h-[calc(100svh-5.5rem)]">
            <Head title="Grade Submission" />

            <div className="flex flex-wrap items-center justify-between gap-3">
                <div role="group" aria-label="Grading period" className="inline-flex rounded-lg border bg-muted/50 p-1">
                    {PERIODS.map(({ value, label }) => (
                        <button
                            key={value}
                            type="button"
                            aria-pressed={period === value}
                            onClick={() => setPeriod(value)}
                            className={cn(
                                'rounded-md px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                                period === value ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                            )}
                        >
                            {label}
                        </button>
                    ))}
                </div>
                <div className="relative order-last w-full sm:order-none sm:ml-auto sm:w-64">
                    <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                    <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or ID" aria-label="Search teachers" className="pl-9" />
                </div>
                <div className="w-full sm:w-72">
                    <SchoolYearPicker layout="horizontal-select-only" />
                </div>
            </div>

            {schoolYear?.id && <GradeUploadPanel schoolYearId={schoolYear.id} period={period} query={upload} />}

            <section aria-label="Teachers" className="flex min-h-0 flex-1 flex-col rounded-xl border bg-card">
                <div className="border-b p-3">
                    <div role="group" aria-label="Show teachers with" className="flex flex-wrap gap-1.5">
                        <FilterChip active={!filter} onClick={() => setFilter(null)} label="All teachers" count={teachers.length} />
                        {FILTERS.map(({ value, label }) => (
                            <FilterChip
                                key={value}
                                active={filter === value}
                                onClick={() => setFilter(filter === value ? null : value)}
                                label={label}
                                count={totals[value]}
                                tone={value === 'ready' ? 'primary' : value === 'late' ? 'amber' : undefined}
                            />
                        ))}
                    </div>
                </div>

                <div className="min-h-0 flex-1 overflow-auto">
                    {!schoolYear?.id || overview.isPending ? (
                        <ListSkeleton />
                    ) : overview.isError ? (
                        <div className="space-y-3 p-6 text-center">
                            <p role="alert" className="text-sm text-destructive">
                                {overview.error?.response?.data?.message ?? 'Couldn’t load teachers.'}
                            </p>
                            <Button type="button" size="sm" variant="outline" onClick={() => overview.refetch()}>Try again</Button>
                        </div>
                    ) : rows.length === 0 ? (
                        <div className="space-y-3 p-10 text-center">
                            <p className="text-sm font-medium">{teachers.length === 0 ? 'No classes this semester' : 'No teachers match'}</p>
                            {teachers.length > 0 && (filter || search) && (
                                <Button type="button" size="sm" variant="outline" onClick={() => { setFilter(null); setSearch('') }}>
                                    Show all teachers
                                </Button>
                            )}
                        </div>
                    ) : (
                        <table className="w-full min-w-[46rem] text-sm">
                            <thead className="sticky top-0 z-10 bg-card text-xs text-muted-foreground shadow-[inset_0_-1px_0_hsl(var(--border))]">
                                <tr>
                                    <th scope="col" className="px-4 py-2.5 text-left font-medium">Teacher</th>
                                    <th scope="col" className="px-3 py-2.5 text-right font-medium">Classes</th>
                                    <th scope="col" className="px-3 py-2.5 text-right font-medium">Not submitted</th>
                                    <th scope="col" className="px-3 py-2.5 text-right font-medium">Submitted</th>
                                    <th scope="col" className="px-3 py-2.5 text-right font-medium">Ready to deploy</th>
                                    <th scope="col" className="px-3 py-2.5 text-right font-medium">Deployed</th>
                                    <th scope="col" className="px-3 py-2.5 text-right font-medium">Late</th>
                                    <th scope="col" className="w-10 px-3 py-2.5"><span className="sr-only">Open</span></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {rows.map((teacher) => {
                                    const counts = teacher[period]
                                    const href = subjectsHref(teacher)

                                    return (
                                        <tr key={teacher.faculty_id} onClick={() => router.visit(href)} className="cursor-pointer transition-colors hover:bg-muted/50">
                                            <td className="px-4 py-2.5">
                                                <Link href={href} onClick={(event) => event.stopPropagation()} className="font-medium hover:underline focus-visible:underline focus-visible:outline-none">
                                                    {teacher.name}
                                                </Link>
                                                <div className="text-xs text-muted-foreground">{teacher.user_id_no}</div>
                                            </td>
                                            <td className="px-3 py-2.5 text-right tabular-nums">{teacher.classes}</td>
                                            <td className="px-3 py-2.5 text-right"><Count value={counts.not_submitted} /></td>
                                            <td className="px-3 py-2.5 text-right"><Count value={counts.submitted} /></td>
                                            <td className="px-3 py-2.5 text-right">
                                                {counts.ready > 0
                                                    ? <span className="inline-flex min-w-7 justify-center rounded-full bg-primary px-2 py-0.5 text-xs font-semibold tabular-nums text-primary-foreground">{counts.ready}</span>
                                                    : <span className="text-muted-foreground/60">—</span>}
                                            </td>
                                            <td className="px-3 py-2.5 text-right tabular-nums">
                                                {counts.deployed}<span className="text-muted-foreground">/{teacher.classes}</span>
                                            </td>
                                            <td className="px-3 py-2.5 text-right"><Count value={counts.late} tone="font-medium text-amber-700 dark:text-amber-400" /></td>
                                            <td className="px-3 py-2.5 text-right text-muted-foreground"><ChevronRight className="ml-auto size-4" aria-hidden="true" /></td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </section>
        </div>
    )
}

function FilterChip({ active, onClick, label, count, tone }) {
    return (
        <button
            type="button"
            aria-pressed={active}
            onClick={onClick}
            className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                active ? 'border-primary bg-primary/10 text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
        >
            {label}
            <span className={cn(
                'rounded-full px-1.5 text-xs font-semibold tabular-nums',
                tone === 'primary' && count > 0 ? 'bg-primary text-primary-foreground'
                    : tone === 'amber' && count > 0 ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                        : 'bg-muted text-foreground'
            )}>
                {count}
            </span>
        </button>
    )
}

export default VerifiedGrades
VerifiedGrades.layout = (page) => <AuthenticatedLayout title="Grade Submission">{page}</AuthenticatedLayout>
