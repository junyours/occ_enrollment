// Dates and times on the dashboard. Schedules and meeting dates are school
// time (Asia/Manila); the server sends `now` in school time too.
export const SCHOOL_TIME_ZONE = 'Asia/Manila'

export const PERIOD_LABEL = { midterm: 'Midterm', final: 'Final' }

// "13:05" → "1:05 PM"
export function formatClock(value) {
    if (!value) return null

    const [hours, minutes] = value.split(':').map(Number)

    return `${hours % 12 || 12}:${String(minutes).padStart(2, '0')} ${hours >= 12 ? 'PM' : 'AM'}`
}

// "2026-11-25" → "Wed, Nov 25"
export function formatDay(value, options = {}) {
    return new Intl.DateTimeFormat('en-US', {
        timeZone: 'UTC',
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        ...options,
    }).format(new Date(`${value}T12:00:00Z`))
}

// "2026-11-25" → "Nov 25"
export function formatShortDay(value) {
    return formatDay(value, { weekday: undefined })
}

// An ISO time → "Sat, Dec 12, 5:00 PM", in school time.
export function formatMoment(iso) {
    return new Intl.DateTimeFormat('en-US', {
        timeZone: SCHOOL_TIME_ZONE,
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    }).format(new Date(iso))
}

// Whole days from one "YYYY-MM-DD" to another.
export function daysBetween(from, to) {
    return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000)
}

// "Today", "Tomorrow", or "Wed, Nov 25".
export function relativeDay(date, today) {
    const days = daysBetween(today, date)

    if (days === 0) return 'Today'
    if (days === 1) return 'Tomorrow'

    return formatDay(date)
}

// The hour in school time, for the greeting.
export function schoolHour(iso) {
    return Number(new Intl.DateTimeFormat('en-US', {
        timeZone: SCHOOL_TIME_ZONE,
        hour: 'numeric',
        hourCycle: 'h23',
    }).format(new Date(iso)))
}

// A class's page; `tab` opens one of its tabs. The NSTP page has Students
// and Grades only.
export function classUrl(ref, tab) {
    if (ref.kind === 'nstp') {
        return `/classes/nstp-classroom/${ref.hash}${tab === 'grades' ? '?tab=grades' : ''}`
    }

    return `/classes/classroom/${ref.hash}${tab ? `?tab=${tab}` : ''}`
}

export function assignmentUrl(ref, assignmentId) {
    return `/classes/classroom/${ref.hash}/assignments/${assignmentId}`
}

export function plural(count, one, many = `${one}s`) {
    return `${count} ${count === 1 ? one : many}`
}
