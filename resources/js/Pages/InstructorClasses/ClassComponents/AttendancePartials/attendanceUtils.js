import { formatName } from "@/Lib/InfoUtils"

export const STATUSES = [
    {
        value: 'present',
        label: 'Present',
        short: 'P',
        tone: 'border-emerald-600 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
    },
    {
        value: 'late',
        label: 'Late',
        short: 'L',
        tone: 'border-amber-600 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200',
    },
    {
        value: 'absent',
        label: 'Absent',
        short: 'A',
        tone: 'border-rose-600 bg-rose-50 text-rose-800 dark:bg-rose-950 dark:text-rose-200',
    },
    {
        value: 'excused',
        label: 'Excused',
        short: 'E',
        tone: 'border-sky-600 bg-sky-50 text-sky-800 dark:bg-sky-950 dark:text-sky-200',
    },
]

export function editableRecord(row) {
    return {
        student_subject_id: String(row.student_subject_id),
        status: row.status ?? null,
        time_in: row.time_in ? row.time_in.slice(0, 5) : '',
        remarks: row.remarks ?? '',
    }
}

export function recordMap(records) {
    return Object.fromEntries(
        records.map((row) => [
            String(row.student_subject_id),
            editableRecord(row),
        ]),
    )
}

export function changedRows(draft, baseline) {
    return Object.values(draft).filter((row) => {
        const old = baseline[row.student_subject_id]

        return (
            !old ||
            row.status !== old.status ||
            row.time_in !== old.time_in ||
            row.remarks !== old.remarks
        )
    })
}

export function summarize(records) {
    const result = {
        total: records.length,
        present: 0,
        late: 0,
        absent: 0,
        excused: 0,
        unmarked: 0,
    }

    records.forEach((row) => {
        result[row.status || 'unmarked'] += 1
    })

    result.marked = result.total - result.unmarked

    const denominator =
        result.present + result.late + result.absent

    result.rate = denominator
        ? Math.round(
            ((result.present + result.late) / denominator) * 100,
        )
        : null

    return result
}

export function meetingLabel(session) {
    if (session.locked_at) return 'Locked'
    if (session.status === 'cancelled') return 'Cancelled'
    if (!session.roster_initialized_at) return 'Not started'
    if (Number(session.marked_count) === 0) return 'Not taken'

    return Number(session.marked_count) < Number(session.roster_count)
        ? 'Partially recorded'
        : 'Recorded'
}

export function formatDate(value, short = false) {
    return new Intl.DateTimeFormat('en-PH', {
        timeZone: 'UTC',
        weekday: short ? 'short' : 'long',
        month: short ? 'short' : 'long',
        day: 'numeric',
        ...(short ? {} : { year: 'numeric' }),
    }).format(new Date(`${value}T12:00:00Z`))
}

export function studentName(row) {
    return formatName(row, { format: 'LFM', casing: 'upper' });
}

export function initials(row) {
    return (
        `${row.first_name?.[0] || ''}${row.last_name?.[0] || ''}` ||
        '?'
    )
}

// Supports:
// single-Monday
// Wednesday
// Consecutive: Monday-Thursday
// alternating:mon,wed,thu,sat
export function scheduleDays(value = '') {
    const text = String(value)
        .toLowerCase()
        .replace(/[–—]/g, '-')
        .trim()

    const tokens = [
        ...text.matchAll(
            /\b(sun(?:day)?|mon(?:day)?|tue(?:s(?:day)?)?|wed(?:nesday)?|thu(?:rs(?:day)?)?|fri(?:day)?|sat(?:urday)?)\b/g,
        ),
    ]

    const numbers = {
        sun: 0,
        mon: 1,
        tue: 2,
        wed: 3,
        thu: 4,
        fri: 5,
        sat: 6,
    }

    const days = tokens.map(
        (token) => numbers[token[0].slice(0, 3)],
    )

    if (days.length === 2) {
        const between = text.slice(
            tokens[0].index + tokens[0][0].length,
            tokens[1].index,
        )

        if (/^\s*(?:-|to)\s*$/.test(between)) {
            const range = []

            for (
                let day = days[0];
                range.length < 7;
                day = (day + 1) % 7
            ) {
                range.push(day)
                if (day === days[1]) break
            }

            return range
        }
    }

    return [...new Set(days)]
}

export function suggestedDates(
    day,
    today,
    sessions = [],
    limit = 8,
) {
    const days = new Set(scheduleDays(day))

    const existing = new Set(
        sessions
            .filter((item) => item.status !== 'cancelled')
            .map((item) => item.attendance_date),
    )

    const date = new Date(`${today}T12:00:00Z`)
    if (!Number.isFinite(date.getTime())) return []

    const dates = []

    for (
        let offset = 0;
        offset < 60 && dates.length < limit;
        offset += 1
    ) {
        const value = date.toISOString().slice(0, 10)

        if (
            days.has(date.getUTCDay()) &&
            !existing.has(value)
        ) {
            dates.push(value)
        }

        date.setUTCDate(date.getUTCDate() + 1)
    }

    return dates
}

export function schoolToday() {
    const parts = Object.fromEntries(
        new Intl.DateTimeFormat('en', {
            timeZone: 'Asia/Manila',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        })
            .formatToParts(new Date())
            .map(({ type, value }) => [type, value]),
    )

    return `${parts.year}-${parts.month}-${parts.day}`
}

export function sessionCounts(session, rows) {
    const stats = rows ? summarize(rows) : null

    return {
        ...session,
        ...(stats
            ? {
                roster_count: stats.total,
                marked_count: stats.marked,
            }
            : {}),
        ...Object.fromEntries(
            STATUSES.map(({ value }) => [
                `${value}_count`,
                stats
                    ? stats[value]
                    : Number(session[`${value}_count`] || 0),
            ]),
        ),
    }
}