import { useState } from 'react'
import { Link } from '@inertiajs/react'
import { AlertTriangle, CalendarClock, CheckCircle2, ClipboardCheck, RotateCcw, UserCheck } from 'lucide-react'
import { Button } from '@/Components/ui/button'
import { cn } from '@/Lib/Utils'
import Section, { useShowMore } from './Section'
import {
    PERIOD_LABEL,
    SCHOOL_TIME_ZONE,
    assignmentUrl,
    classUrl,
    daysBetween,
    formatDay,
    formatMoment,
    plural,
} from '../dashboardUtils'

const KINDS = {
    grades_returned: { icon: RotateCcw, tone: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' },
    grades_late: { icon: AlertTriangle, tone: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' },
    grades_due: { icon: CalendarClock, tone: 'bg-primary/10 text-primary' },
    to_grade: { icon: ClipboardCheck, tone: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300' },
    attendance: { icon: UserCheck, tone: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' },
}

// "in 3 days", "tomorrow" or "today", counting school days.
function timeLeft(iso, today) {
    const date = new Intl.DateTimeFormat('en-CA', { timeZone: SCHOOL_TIME_ZONE }).format(new Date(iso))
    const days = daysBetween(today, date)

    if (days <= 0) return 'today'
    if (days === 1) return 'tomorrow'

    return `in ${days} days`
}

function classLabel(ref) {
    return `${ref.title} · ${ref.section}`
}

// How many classes show before "+N more".
const SHOWN_CLASSES = 3

// Links to each class whose grades are due or overdue: the first few, and
// the rest on request.
function ClassLinks({ classes }) {
    const [expanded, setExpanded] = useState(false)
    const shown = expanded ? classes : classes.slice(0, SHOWN_CLASSES)
    const hidden = classes.length - shown.length
    const toggle = 'rounded-md px-2 py-1 text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

    return (
        <div className="mt-2 flex flex-wrap gap-1.5">
            {shown.map((ref) => (
                <Link
                    key={ref.key}
                    href={classUrl(ref, 'grades')}
                    className="max-w-full truncate rounded-md border px-2 py-1 text-xs font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    {classLabel(ref)}
                </Link>
            ))}
            {hidden > 0 && (
                <button type="button" onClick={() => setExpanded(true)} className={toggle}>
                    +{hidden} more
                </button>
            )}
            {expanded && classes.length > SHOWN_CLASSES && (
                <button type="button" onClick={() => setExpanded(false)} className={toggle}>
                    Show fewer
                </button>
            )}
        </div>
    )
}

// How many of the period's classes are in.
function Progress({ done, total, tone }) {
    return (
        <div
            role="progressbar"
            aria-label={`${done} of ${total} classes submitted`}
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={done}
            className="mt-2 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-muted"
        >
            <div className={cn('h-full rounded-full', tone)} style={{ width: `${total > 0 ? Math.round(done / total * 100) : 0}%` }} />
        </div>
    )
}

// What one item says, and where it leads.
function describe(item, today) {
    const period = PERIOD_LABEL[item.period]

    switch (item.type) {
        case 'grades_returned':
            return {
                title: `${period} grades sent back`,
                detail: classLabel(item.class),
                note: item.reason,
                action: { label: 'Fix grades', href: classUrl(item.class, 'grades') },
            }
        case 'grades_late':
            return {
                title: `${period} grades overdue`,
                detail: item.closed_at
                    ? `Upload closed ${formatMoment(item.closed_at)}. You can still submit late.`
                    : 'Upload has closed. You can still submit late.',
                classes: item.classes,
                progress: { done: item.submitted, total: item.total, tone: 'bg-amber-500' },
            }
        case 'grades_due':
            return {
                title: `${period} grades due`,
                detail: item.closes_at
                    ? `Upload closes ${formatMoment(item.closes_at)} · ${timeLeft(item.closes_at, today)}`
                    : 'Upload is open.',
                classes: item.classes,
                progress: { done: item.submitted, total: item.total, tone: 'bg-primary' },
            }
        case 'to_grade':
            return {
                title: item.title,
                detail: `${plural(item.count, 'submission')} to grade · ${classLabel(item.class)}`,
                action: { label: 'Grade', href: assignmentUrl(item.class, item.assignment_id) },
            }
        case 'attendance':
            return {
                title: `Attendance for ${formatDay(item.date)}${item.number > 1 ? `, meeting ${item.number}` : ''}`,
                detail: `${plural(item.count, 'student')} not marked · ${classLabel(item.class)}`,
                action: { label: 'Finish', href: classUrl(item.class, 'attendance') },
            }
        default:
            return null
    }
}

function TodoRow({ item, today }) {
    const text = describe(item, today)
    const { icon: Icon, tone } = KINDS[item.type]

    return (
        <li className="grid grid-cols-[2rem_minmax(0,1fr)] items-center gap-x-3 gap-y-2 px-4 py-3 sm:grid-cols-[2rem_minmax(0,1fr)_auto]">
            <span className={cn('flex size-8 items-center justify-center self-start rounded-full', tone)}>
                <Icon aria-hidden="true" className="size-4" />
            </span>

            <div className="min-w-0">
                <div className="flex items-baseline justify-between gap-3">
                    <p className="text-sm font-medium">{text.title}</p>
                    {text.progress?.total > 0 && (
                        <p className="shrink-0 text-xs tabular-nums text-muted-foreground">
                            {text.progress.done} of {text.progress.total} submitted
                        </p>
                    )}
                </div>
                <p className="text-xs text-muted-foreground">{text.detail}</p>
                {text.progress?.total > 0 && <Progress {...text.progress} />}
                {text.note && (
                    <p className="mt-1 line-clamp-2 border-l-2 pl-2 text-xs italic text-muted-foreground">{text.note}</p>
                )}
                {text.classes && <ClassLinks classes={text.classes} />}
            </div>

            {text.action && (
                <Button asChild size="sm" variant="outline" className="col-start-2 justify-self-start sm:col-start-auto sm:justify-self-end">
                    <Link href={text.action.href}>{text.action.label}</Link>
                </Button>
            )}
        </li>
    )
}

function itemKey(item) {
    return [item.type, item.period, item.class?.key, item.assignment_id, item.session_id].filter(Boolean).join(':')
}

// Grades sent back come first, then overdue and due grades, work to grade,
// and attendance left unfinished.
export default function TodoList({ items, today, className }) {
    const { visible, toggle } = useShowMore(items, 8)

    return (
        <Section id="todo" title="To do" meta={items.length > 0 && plural(items.length, 'item')} className={className}>
            {items.length === 0 ? (
                <p className="flex items-center gap-2 px-4 py-6 text-sm text-muted-foreground">
                    <CheckCircle2 aria-hidden="true" className="size-4 text-emerald-600 dark:text-emerald-400" />
                    All caught up.
                </p>
            ) : (
                <ul className="divide-y">
                    {visible.map((item) => (
                        <TodoRow key={itemKey(item)} item={item} today={today} />
                    ))}
                </ul>
            )}
            {toggle}
        </Section>
    )
}
