import React, { createContext, useContext } from 'react'
import axios from 'axios'
import {
    useMutation,
    useQuery,
    useQueryClient,
} from '@tanstack/react-query'

const Context = createContext(null)

export function ClassworkProvider({
    classId,
    userId,
    children,
}) {
    const value = {
        base: `/classes/${encodeURIComponent(classId)}/classwork`,
        key: ['classwork', String(userId), String(classId)],
    }

    return (
        <Context.Provider value={value}>
            {children}
        </Context.Provider>
    )
}

export function useClasswork() {
    const value = useContext(Context)

    if (!value) {
        throw new Error('ClassworkProvider is missing.')
    }

    return value
}

export function useClassworkQuery(path, options = {}) {
    const { base, key } = useClasswork()

    return useQuery({
        queryKey: [...key, path],

        queryFn: async ({ signal }) => {
            const response = await axios.get(
                `${base}/${path}`,
                { signal }
            )

            return response.data
        },

        staleTime: 30_000,
        gcTime: 5 * 60_000,

        retry: (count, error) =>
            count < 2 &&
            (!error.response || error.response.status >= 500),

        ...options,
    })
}

export function useClassworkMutation(work, onSuccess) {
    const context = useClasswork()
    const client = useQueryClient()

    return useMutation({
        mutationFn: (variables) =>
            work(variables, context.base),

        retry: false,

        onSuccess: async (data, variables) => {
            await client.invalidateQueries({
                queryKey: context.key,
            })

            await onSuccess?.(data, variables)
        },
    })
}

// Query keys the Grading tab caches assessments and scores under.
const GRADING_QUERY_PREFIXES = [
    'class-gradings',
    'grade-summary',
    'assessment-scores',
    'assessment-info',
]

export function refreshGrading(client) {
    return Promise.all(GRADING_QUERY_PREFIXES.map((prefix) =>
        client.invalidateQueries({ queryKey: [prefix] })
    ))
}

export function errorMessage(error) {
    const data = error?.response?.data

    if (data?.errors) {
        return Object.values(data.errors)
            .flat()
            .join(' ')
    }

    return (
        data?.message ||
        error?.message ||
        'Something went wrong. Please try again.'
    )
}

export function ErrorNotice({ error }) {
    if (!error) return null

    return (
        <p role="alert" className="text-sm text-destructive">
            {errorMessage(error)}
        </p>
    )
}

export function localDateInput(value) {
    if (!value) return ''

    const date = new Date(value)
    const pad = (number) => String(number).padStart(2, '0')

    return (
        `${date.getFullYear()}-` +
        `${pad(date.getMonth() + 1)}-` +
        `${pad(date.getDate())}T` +
        `${pad(date.getHours())}:` +
        `${pad(date.getMinutes())}`
    )
}

// Server timestamps are UTC. ISO values carry their zone; plain
// "Y-m-d H:i:s" values from the database do not, so read them as UTC.
export function parseServerDate(value) {
    if (!value) return null

    const raw = String(value)
    const iso = raw.includes('T') ? raw : `${raw.replace(' ', 'T')}Z`
    const date = new Date(iso)

    return Number.isNaN(date.getTime()) ? null : date
}

const DATE_FORMAT = { month: 'short', day: 'numeric', year: 'numeric' }
const TIME_FORMAT = { hour: 'numeric', minute: '2-digit', hour12: true }

// One format everywhere: "Nov 20, 2026" and "Nov 20, 2026 · 4:30 PM".
export function formatDate(value) {
    const date = value instanceof Date ? value : parseServerDate(value)
    return date ? date.toLocaleDateString('en-US', DATE_FORMAT) : ''
}

export function formatTime(value) {
    const date = value instanceof Date ? value : parseServerDate(value)
    return date ? date.toLocaleTimeString('en-US', TIME_FORMAT) : ''
}

export function formatDateTime(value) {
    const date = value instanceof Date ? value : parseServerDate(value)
    return date ? `${formatDate(date)} · ${formatTime(date)}` : ''
}

export function displayDate(value) {
    if (!value) return 'No deadline'
    return formatDateTime(value) || 'Date unavailable'
}

function dayDifference(from, to) {
    const start = new Date(from.getFullYear(), from.getMonth(), from.getDate())
    const end = new Date(to.getFullYear(), to.getMonth(), to.getDate())
    return Math.round((end - start) / 86_400_000)
}

export function isLate(submittedAt, dueAt) {
    const submitted = parseServerDate(submittedAt)
    const due = parseServerDate(dueAt)
    return Boolean(submitted && due && submitted > due)
}

export function isPastDue(dueAt, now = new Date()) {
    const due = parseServerDate(dueAt)
    return Boolean(due && now > due)
}

/**
 * A student's state for one assignment, from the `mine` summary the list
 * endpoint returns. `done` separates "To do" from "Done" in filters.
 */
export function studentStatus(item, now = new Date()) {
    const mine = item.mine ?? {}
    const due = parseServerDate(item.due_at)
    const late = isLate(mine.submitted_at, item.due_at)

    if (mine.score !== null && mine.score !== undefined) {
        return {
            key: 'graded',
            label: `Graded · ${mine.score}/${item.max_score}`,
            tone: 'success',
            done: true,
        }
    }

    if (mine.submitted_at) {
        return {
            key: 'turned-in',
            label: late ? 'Turned in late' : 'Turned in',
            tone: late ? 'warning' : 'info',
            done: true,
        }
    }

    if (due && now > due) {
        return item.allow_late
            ? { key: 'missing', label: 'Missing · late work accepted', tone: 'danger', done: false }
            : { key: 'closed', label: 'Missing · closed', tone: 'danger', done: false }
    }

    if (due) {
        const days = dayDifference(now, due)

        if (days <= 1) {
            return {
                key: 'due-soon',
                label: `Due ${days === 0 ? 'today' : 'tomorrow'} · ${formatTime(due)}`,
                tone: 'warning',
                done: false,
            }
        }
    }

    return mine.started
        ? { key: 'in-progress', label: 'In progress', tone: 'neutral', done: false }
        : { key: 'assigned', label: 'Assigned', tone: 'neutral', done: false }
}

/** The teacher's at-a-glance progress for one assignment. */
export function classProgress(progress) {
    if (!progress) return null

    const { students, turned_in: turnedIn, to_grade: toGrade } = progress

    if (!students) {
        return { label: 'No students enrolled', tone: 'neutral' }
    }

    if (toGrade > 0) {
        return {
            label: `${turnedIn}/${students} turned in · ${toGrade} to grade`,
            tone: 'info',
        }
    }

    return {
        label: turnedIn > 0
            ? `${turnedIn}/${students} turned in · all graded`
            : `0/${students} turned in`,
        tone: turnedIn > 0 ? 'success' : 'neutral',
    }
}