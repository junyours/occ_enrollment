import { Link } from '@inertiajs/react'
import { ChevronRight } from 'lucide-react'
import { buttonVariants } from '@/Components/ui/button'
import { cn } from '@/Lib/Utils'
import Section from './Section'
import { classUrl, formatClock, plural, relativeDay } from '../dashboardUtils'

const WARN = 'text-amber-700 dark:text-amber-400'

// Where the meeting's attendance stands. NSTP classes have no attendance.
// `phoneOnly` notes stand in for the button, which phones don't show.
function attendanceNote(meeting) {
    const attendance = meeting.attendance

    switch (attendance?.status) {
        case 'taken':
            return { text: `Attendance taken · ${attendance.present} present · ${attendance.absent} absent`, tone: 'text-emerald-700 dark:text-emerald-400' }
        case 'unmarked':
            return { text: `${plural(attendance.unmarked, 'student')} not marked yet`, tone: WARN }
        case 'cancelled':
            return { text: 'Meeting cancelled', tone: 'text-muted-foreground' }
        case 'not_taken':
            if (meeting.state === 'done') return { text: 'Attendance not taken', tone: WARN }
            if (meeting.state === 'ongoing') return { text: 'Take attendance', tone: 'text-primary', phoneOnly: true }
            return null
        default:
            return null
    }
}

function nextStep(meeting) {
    const status = meeting.attendance?.status

    if (!status) {
        return { label: 'Open class', variant: 'outline', href: classUrl(meeting.class) }
    }

    const href = classUrl(meeting.class, 'attendance')

    if (status === 'not_taken') {
        return meeting.state === 'upcoming'
            ? { label: 'Attendance', variant: 'outline', href }
            : { label: 'Take attendance', variant: 'default', href }
    }

    return status === 'unmarked'
        ? { label: 'Finish', variant: 'outline', href }
        : { label: 'View', variant: 'ghost', href }
}

// One meeting, as a single link. Wider screens show the next step as a
// button-styled label; phones show an arrow, which keeps the row short.
function MeetingRow({ meeting }) {
    const note = attendanceNote(meeting)
    const step = nextStep(meeting)
    const ongoing = meeting.state === 'ongoing'
    const done = meeting.state === 'done'

    return (
        <li>
            <Link
                href={step.href}
                className={cn(
                    'grid grid-cols-[4.25rem_minmax(0,1fr)_auto] items-center gap-x-3 px-4 py-3 transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none',
                    ongoing && 'bg-primary/5 hover:bg-primary/10',
                )}
            >
                <span className="self-start tabular-nums">
                    <span className={cn('block text-sm font-medium', done && 'text-muted-foreground')}>
                        {formatClock(meeting.start) ?? 'TBA'}
                    </span>
                    {ongoing ? (
                        <span className="flex items-center gap-1 text-xs font-medium text-primary">
                            <span aria-hidden="true" className="size-1.5 rounded-full bg-primary motion-safe:animate-pulse" />
                            Now
                        </span>
                    ) : meeting.end && (
                        <span className="block text-xs text-muted-foreground">{formatClock(meeting.end)}</span>
                    )}
                </span>

                <span className="min-w-0">
                    <span className={cn('block truncate text-sm font-medium', done && 'text-muted-foreground')}>{meeting.class.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                        {[meeting.class.section, meeting.room].filter(Boolean).join(' · ')}
                    </span>
                    {note && (
                        <span className={cn('mt-0.5 block text-xs font-medium', note.tone, note.phoneOnly && 'sm:hidden')}>{note.text}</span>
                    )}
                </span>

                <span aria-hidden="true" className={cn(buttonVariants({ variant: step.variant, size: 'sm' }), 'hidden sm:inline-flex')}>
                    {step.label}
                </span>
                <ChevronRight aria-hidden="true" className="size-4 text-muted-foreground sm:hidden" />
            </Link>
        </li>
    )
}

// The soonest class still to come, for days with no classes left.
function NextClass({ item, today }) {
    const { next } = item

    return (
        <Link
            href={classUrl(item)}
            className="flex items-center justify-between gap-3 border-t px-4 py-3 transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
        >
            <span className="min-w-0">
                <span className="block text-xs text-muted-foreground">Next class</span>
                <span className="block truncate text-sm font-medium">{item.title} · {item.section}</span>
            </span>
            <span className="shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                <span className="block font-medium text-foreground">
                    {relativeDay(next.date, today)}{next.start ? `, ${formatClock(next.start)}` : ''}
                </span>
                {next.room && <span className="block">{next.room}</span>}
            </span>
        </Link>
    )
}

export default function TodayClasses({ meetings, upcoming, today, className }) {
    const allDone = meetings.length > 0 && meetings.every((meeting) => meeting.state === 'done')

    return (
        <Section id="today" title="Today" meta={meetings.length > 0 && plural(meetings.length, 'class', 'classes')} className={className}>
            {meetings.length === 0 ? (
                <p className="px-4 py-6 text-sm text-muted-foreground">No classes today.</p>
            ) : (
                <ul className="divide-y">
                    {meetings.map((meeting, index) => (
                        <MeetingRow key={`${meeting.class.key}:${meeting.start}:${index}`} meeting={meeting} />
                    ))}
                </ul>
            )}
            {(meetings.length === 0 || allDone) && upcoming && <NextClass item={upcoming} today={today} />}
        </Section>
    )
}
