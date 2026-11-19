import { capitalizeFirstLetter } from '@/Lib/Utils'

import { formatDateTime, formatTime, parseServerDate } from '../Shared/api'

// "Maria L. Santos", from user_information fields. Posts whose author's
// account is gone show as from the instructor.
export function personName(person) {
    if (!person?.first_name && !person?.last_name) return 'Instructor'

    const middle = person.middle_name
        ? ` ${capitalizeFirstLetter(person.middle_name).charAt(0)}.`
        : ''

    return `${capitalizeFirstLetter(person.first_name ?? '')}${middle} ${capitalizeFirstLetter(person.last_name ?? '')}`.trim()
}

export function initials(person) {
    const letters = [person?.first_name, person?.last_name]
        .map((part) => String(part ?? '').trim().charAt(0))
        .join('')

    return letters.toUpperCase() || 'I'
}

function startOfDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

// "Today · 4:30 PM", "Yesterday · 9:05 AM", otherwise "Nov 3, 2026 · 4:30 PM".
export function whenPosted(value, now = new Date()) {
    const date = parseServerDate(value)
    if (!date) return ''

    const days = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000)

    if (days === 0) return `Today · ${formatTime(date)}`
    if (days === 1) return `Yesterday · ${formatTime(date)}`

    return formatDateTime(date)
}

// Whether rich text has anything to read, not just tags and spaces.
export function hasText(html) {
    return String(html ?? '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;|&#160;| /gi, ' ')
        .trim() !== ''
}
