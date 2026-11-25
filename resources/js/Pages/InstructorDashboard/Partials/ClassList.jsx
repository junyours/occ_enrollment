import { Link } from '@inertiajs/react'
import { cn } from '@/Lib/Utils'
import Section, { useShowMore } from './Section'
import { classUrl, formatClock, plural, relativeDay } from '../dashboardUtils'

// Wide screens: one row per class in these columns. Narrower: stacked.
const COLUMNS = 'xl:grid-cols-[minmax(0,1fr)_14rem_4.5rem_5.5rem_4.5rem_4.5rem]'
const SKY = 'text-sky-700 dark:text-sky-400'
const ROSE = 'text-rose-700 dark:text-rose-400'

function nextMeeting(next, today) {
    if (!next) return 'No schedule'

    const time = next.start ? `, ${formatClock(next.start)}` : ''

    return `${relativeDay(next.date, today)}${time}${next.room ? ` · ${next.room}` : ''}`
}

// One figure in its wide-screen column. A dash when it doesn't apply.
function Cell({ label, value, tone }) {
    return (
        <span className={cn('hidden text-right text-sm tabular-nums xl:block', value === '—' ? 'text-muted-foreground' : tone)}>
            <span className="sr-only">{label}: </span>
            {value}
        </span>
    )
}

function ClassRow({ item, today }) {
    // NSTP classes have no attendance or classwork here.
    const regular = item.kind === 'regular'
    const rate = regular && item.attendance_rate !== null ? `${item.attendance_rate}%` : '—'

    // Phones: the figures as one line, leaving out what doesn't apply.
    const summary = [
        plural(item.students, 'student'),
        rate !== '—' && `${rate} attendance`,
        regular && item.to_grade > 0 && `${item.to_grade} to grade`,
    ].filter(Boolean).join(' · ')

    return (
        <li>
            <Link
                href={classUrl(item)}
                className={cn(
                    'grid gap-x-4 gap-y-0.5 px-4 py-3 transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none xl:items-center',
                    COLUMNS,
                )}
            >
                <div className="min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-sm font-medium">{item.title}</p>
                        {item.at_risk > 0 && (
                            <span className="shrink-0 rounded-full border border-rose-300 bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-800 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-200 xl:hidden">
                                {item.at_risk} at risk
                            </span>
                        )}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                        {[item.section, item.code].filter(Boolean).join(' · ')}
                    </p>
                </div>

                <p className="truncate text-xs text-muted-foreground xl:text-sm xl:text-foreground">
                    <span className="xl:hidden">Next: </span>
                    {nextMeeting(item.next, today)}
                </p>

                <p className="text-xs text-muted-foreground xl:hidden">{summary}</p>

                <Cell label="Students" value={item.students} />
                <Cell label="Attendance" value={rate} />
                <Cell label="To grade" value={regular ? item.to_grade : '—'} tone={item.to_grade > 0 ? SKY : 'text-muted-foreground'} />
                <Cell label="At risk" value={item.at_risk} tone={item.at_risk > 0 ? ROSE : 'text-muted-foreground'} />
            </Link>
        </li>
    )
}

// The teacher's classes as a compact list, soonest next meeting first.
export default function ClassList({ classes, today }) {
    const { visible, toggle } = useShowMore(classes, 8)

    return (
        <Section
            id="classes"
            title="My classes"
            meta={
                <>
                    {plural(classes.length, 'class', 'classes')} ·{' '}
                    <Link href="/classes" className="font-medium text-primary hover:underline">Schedule</Link>
                </>
            }
        >
            <div aria-hidden="true" className={cn('hidden gap-x-4 border-b px-4 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground xl:grid', COLUMNS)}>
                <span>Class</span>
                <span>Next meeting</span>
                <span className="text-right">Students</span>
                <span className="text-right">Attendance</span>
                <span className="text-right">To grade</span>
                <span className="text-right">At risk</span>
            </div>

            <ul className="divide-y">
                {visible.map((item) => (
                    <ClassRow key={item.key} item={item} today={today} />
                ))}
            </ul>
            {toggle}
        </Section>
    )
}
