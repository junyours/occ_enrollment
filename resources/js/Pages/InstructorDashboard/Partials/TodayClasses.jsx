import { Link } from '@inertiajs/react'
import { Button } from '@/Components/ui/button'
import { cn } from '@/Lib/Utils'
import Section from './Section'
import { classUrl, formatClock, plural } from '../dashboardUtils'

const WARN = 'text-amber-700 dark:text-amber-400'

// Where the meeting's attendance stands. NSTP classes have no attendance.
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
            return meeting.state === 'done' ? { text: 'Attendance not taken', tone: WARN } : null
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

function MeetingRow({ meeting }) {
    const note = attendanceNote(meeting)
    const step = nextStep(meeting)
    const ongoing = meeting.state === 'ongoing'
    const done = meeting.state === 'done'

    return (
        <li className={cn(
            'grid grid-cols-[4.25rem_minmax(0,1fr)] items-center gap-x-3 gap-y-2 px-4 py-3 sm:grid-cols-[4.25rem_minmax(0,1fr)_auto]',
            ongoing && 'bg-primary/5',
        )}>
            <div className="self-start tabular-nums">
                <p className={cn('text-sm font-medium', done && 'text-muted-foreground')}>
                    {formatClock(meeting.start) ?? 'TBA'}
                </p>
                {ongoing ? (
                    <p className="flex items-center gap-1 text-xs font-medium text-primary">
                        <span aria-hidden="true" className="size-1.5 animate-pulse rounded-full bg-primary" />
                        Now
                    </p>
                ) : meeting.end && (
                    <p className="text-xs text-muted-foreground">{formatClock(meeting.end)}</p>
                )}
            </div>

            <div className="min-w-0">
                <p className={cn('truncate text-sm font-medium', done && 'text-muted-foreground')}>{meeting.class.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                    {[meeting.class.section, meeting.room].filter(Boolean).join(' · ')}
                </p>
                {note && <p className={cn('mt-0.5 text-xs font-medium', note.tone)}>{note.text}</p>}
            </div>

            <Button
                asChild
                size="sm"
                variant={step.variant}
                className={cn(
                    'col-start-2 justify-self-start sm:col-start-auto sm:justify-self-end',
                    // Under the text on phones: line the borderless label up with it.
                    step.variant === 'ghost' && '-ml-3 sm:ml-0',
                )}
            >
                <Link href={step.href}>{step.label}</Link>
            </Button>
        </li>
    )
}

export default function TodayClasses({ meetings, className }) {
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
        </Section>
    )
}
