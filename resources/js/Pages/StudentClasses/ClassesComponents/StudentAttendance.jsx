import React, { useId } from 'react'
import axios from 'axios'
import { usePage } from '@inertiajs/react'
import { useQuery } from '@tanstack/react-query'
import { CalendarCheck, Lock } from 'lucide-react'

import { Button } from '@/Components/ui/button'
import { Skeleton } from '@/Components/ui/skeleton'
import { cn } from '@/Lib/Utils'
import { ErrorNotice } from '@/Pages/InstructorClasses/ClassComponents/Classwork/Shared/api'
import { STATUSES, formatDate } from '@/Pages/InstructorClasses/ClassComponents/AttendancePartials/attendanceUtils'

// Number colours for the totals, matching the teacher's summary cards.
const COUNT_TONE = {
    present: 'text-emerald-700 dark:text-emerald-400',
    late: 'text-amber-700 dark:text-amber-400',
    absent: 'text-rose-700 dark:text-rose-400',
    excused: 'text-sky-700 dark:text-sky-400',
}

// "08:17" → "8:17 AM"
function formatTime(value) {
    const [hours, minutes] = value.split(':').map(Number)

    return `${hours % 12 || 12}:${String(minutes).padStart(2, '0')} ${hours >= 12 ? 'PM' : 'AM'}`
}

function Mark({ status, timeIn }) {
    const meta = STATUSES.find((entry) => entry.value === status)

    if (!meta) {
        return (
            <span className="inline-flex shrink-0 items-center rounded-full border border-dashed px-2.5 py-0.5 text-xs text-muted-foreground">
                Not recorded yet
            </span>
        )
    }

    return (
        <span className={cn('inline-flex shrink-0 items-center rounded-full border px-2.5 py-0.5 text-xs font-medium', meta.tone)}>
            {meta.label}
            {status === 'late' && timeIn ? ` · ${formatTime(timeIn)}` : ''}
        </span>
    )
}

function Totals({ totals }) {
    return (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
            <div className="col-span-4 rounded-xl border bg-card px-3 py-2.5 sm:col-span-1">
                <p className="text-xl font-semibold tabular-nums">{totals.rate === null ? '—' : `${totals.rate}%`}</p>
                <p className="text-xs text-muted-foreground">Attendance</p>
            </div>

            {STATUSES.map(({ value, label }) => (
                <div key={value} className="min-w-0 rounded-xl border bg-card px-3 py-2.5">
                    <p className={cn('text-xl font-semibold tabular-nums', COUNT_TONE[value])}>{totals[value]}</p>
                    <p className="truncate text-xs text-muted-foreground">{label}</p>
                </div>
            ))}
        </div>
    )
}

function Period({ period }) {
    const headingId = useId()
    const count = period.meetings.length

    return (
        <section aria-labelledby={headingId} className="space-y-3">
            <div className="flex items-baseline justify-between gap-2">
                <h3 id={headingId} className="text-base font-semibold">{period.label}</h3>
                <span className="text-xs text-muted-foreground">{count} meeting{count === 1 ? '' : 's'}</span>
            </div>

            <Totals totals={period.totals} />

            <ul className="divide-y rounded-xl border bg-card" aria-label={`${period.label} meetings`}>
                {period.meetings.map((meeting) => (
                    <li key={meeting.id} className="flex items-center justify-between gap-3 px-4 py-3">
                        <div className="min-w-0">
                            <p className="flex items-center gap-1.5 text-sm font-medium">
                                {formatDate(meeting.date, true)}
                                {meeting.locked && (
                                    <span title="Locked by your instructor" className="text-muted-foreground">
                                        <Lock className="size-3.5" aria-hidden="true" />
                                        <span className="sr-only">(locked)</span>
                                    </span>
                                )}
                            </p>
                            {meeting.number > 1 && (
                                <p className="text-xs text-muted-foreground">Meeting {meeting.number}</p>
                            )}
                        </div>

                        <Mark status={meeting.status} timeIn={meeting.time_in} />
                    </li>
                ))}
            </ul>
        </section>
    )
}

/**
 * The signed-in student's attendance in one class, as the teacher records
 * it: totals and meetings for each grading period, newest first.
 */
export default function StudentAttendance({ classId }) {
    const { auth } = usePage().props

    const query = useQuery({
        queryKey: ['attendance', String(auth.user.id), String(classId), 'mine'],
        queryFn: async ({ signal }) => (
            await axios.get(`/classes/${encodeURIComponent(classId)}/attendance/mine`, { signal })
        ).data,
        staleTime: 30_000,
        retry: (count, error) => count < 2 && (!error.response || error.response.status >= 500),
    })

    if (query.isPending) {
        return (
            <div role="status" aria-label="Loading attendance" className="space-y-3">
                <Skeleton className="h-16 w-full rounded-xl" />
                <Skeleton className="h-40 w-full rounded-xl" />
            </div>
        )
    }

    if (query.isError) {
        return (
            <div className="space-y-3">
                <ErrorNotice error={query.error} />
                <Button type="button" variant="outline" size="sm" disabled={query.isFetching} onClick={() => query.refetch()}>
                    Try again
                </Button>
            </div>
        )
    }

    const periods = query.data?.periods ?? []

    if (periods.length === 0) {
        return (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-10 text-center">
                <CalendarCheck className="size-6 text-muted-foreground" aria-hidden="true" />
                <p className="text-sm font-medium">No attendance yet</p>
                <p className="text-sm text-muted-foreground">It shows here once your instructor starts taking attendance.</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <p className="text-sm text-muted-foreground">
                Your attendance as your instructor records it. Late counts as attended, and excused meetings
                don’t count against you. Meetings with
                <Lock className="mx-1 inline size-3.5 align-[-2px]" aria-hidden="true" />
                <span className="sr-only">a lock</span>
                are final.
            </p>

            {periods.map((period) => <Period key={period.period} period={period} />)}
        </div>
    )
}
