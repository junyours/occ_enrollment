import { useState } from 'react'
import axios from 'axios'
import { Link, router } from '@inertiajs/react'
import { BellRing, Check, Mail, Phone } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/Components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/Components/ui/dialog'
import { formatName } from '@/Lib/InfoUtils'
import { cn } from '@/Lib/Utils'
import Section, { useShowMore } from './Section'
import { SCHOOL_TIME_ZONE, classUrl, formatShortDay } from '../dashboardUtils'

const TONES = {
    warning: {
        badge: 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200',
        avatar: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200',
        text: 'text-amber-800 dark:text-amber-300',
    },
    limit: {
        badge: 'border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-200',
        avatar: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200',
        text: 'text-rose-700 dark:text-rose-400',
    },
}

const ACTION = 'h-7 gap-1.5 px-2.5 text-xs'

// "Nov 18, Nov 20", or "Nov 4 – Nov 20" for a long run.
function absenceDates(dates) {
    const days = [...new Set(dates)]

    return days.length > 3
        ? `${formatShortDay(days[0])} – ${formatShortDay(days[days.length - 1])}`
        : days.map(formatShortDay).join(', ')
}

// "today", or the school date it was sent, like "Nov 23".
function sentDay(iso, today) {
    const day = new Intl.DateTimeFormat('en-CA', { timeZone: SCHOOL_TIME_ZONE }).format(new Date(iso))

    return day === today ? 'today' : formatShortDay(day)
}

function firstName(student) {
    return formatName({ first_name: student.first_name }, { defaultValue: 'the student' })
}

function StudentRow({ student, today, onNotify }) {
    const tone = TONES[student.reached_limit ? 'limit' : 'warning']
    const name = formatName(student, { format: 'LFM' })
    const initials = `${student.first_name?.[0] ?? ''}${student.last_name?.[0] ?? ''}`.toUpperCase() || '?'

    return (
        <li className="flex gap-3 px-4 py-3">
            <span aria-hidden="true" className={cn('flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold', tone.avatar)}>
                {initials}
            </span>

            <div className="min-w-0 flex-1">
                <Link
                    href={classUrl(student.class, 'attendance')}
                    className="group block rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                    <span className="flex items-start justify-between gap-2">
                        <span className="truncate text-sm font-medium group-hover:underline">{name}</span>
                        <span className={cn('shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold tabular-nums', tone.badge)}>
                            {student.absences} in a row
                        </span>
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                        {student.class.title} · {student.class.section}
                    </span>
                    <span className={cn('mt-0.5 block text-xs', tone.text)}>
                        Absent {absenceDates(student.dates)}
                        {' · '}
                        {student.reached_limit ? 'reached the drop limit' : 'one more and they’re dropped'}
                    </span>
                </Link>

                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    {student.notified_at ? (
                        <span className="inline-flex h-7 items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                            <Check aria-hidden="true" className="size-3.5" />
                            Notified {sentDay(student.notified_at, today)}
                        </span>
                    ) : (
                        <Button type="button" size="sm" variant="outline" className={ACTION} onClick={() => onNotify(student)} aria-label={`Notify ${name}`}>
                            <BellRing aria-hidden="true" className="size-3.5" />
                            Notify
                        </Button>
                    )}
                    {student.email && (
                        <Button asChild size="sm" variant="ghost" className={ACTION}>
                            <a
                                href={`mailto:${student.email}?subject=${encodeURIComponent(student.notice.title)}`}
                                title={student.email}
                                aria-label={`Email ${name}`}
                            >
                                <Mail aria-hidden="true" className="size-3.5" />
                                Email
                            </a>
                        </Button>
                    )}
                    {student.phone && (
                        <Button asChild size="sm" variant="ghost" className={ACTION}>
                            <a href={`tel:${student.phone.replace(/[^\d+]/g, '')}`} title={student.phone} aria-label={`Call ${name}`}>
                                <Phone aria-hidden="true" className="size-3.5" />
                                Call
                            </a>
                        </Button>
                    )}
                </div>
            </div>
        </li>
    )
}

// Shows the student's notice before it goes, then sends it.
function NotifyDialog({ student, onClose, onSent }) {
    const [sending, setSending] = useState(false)

    const send = async () => {
        setSending(true)

        try {
            const { data } = await axios.post(`/instructor/students/${student.student_subject_id}/absence-notice`)
            toast.success(data.sent ? `Sent to ${firstName(student)}` : `${firstName(student)} was already notified`)
            onSent(student.student_subject_id, data.notified_at)
        } catch (error) {
            toast.error(error.response?.data?.message ?? 'Couldn’t send the notice. Try again.')
        } finally {
            setSending(false)
        }
    }

    return (
        <Dialog open={student !== null} onOpenChange={(open) => !open && !sending && onClose()}>
            <DialogContent className="sm:max-w-md">
                {student && (
                    <>
                        <DialogHeader>
                            <DialogTitle>Notify {firstName(student)}?</DialogTitle>
                            <DialogDescription>They’ll see this in their notifications.</DialogDescription>
                        </DialogHeader>

                        <div className="rounded-lg border bg-muted/40 p-3">
                            <p className="text-sm font-medium">{student.notice.title}</p>
                            <p className="mt-1 text-sm text-muted-foreground">{student.notice.body}</p>
                        </div>

                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button type="button" variant="outline" onClick={onClose} disabled={sending}>Cancel</Button>
                            <Button type="button" onClick={send} disabled={sending}>
                                {sending ? 'Sending…' : 'Send'}
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    )
}

// Students whose latest marks are absences in a row: listed from one
// absence before the school's drop limit, with ways to reach them.
export default function StudentsToWatch({ students, dropAfter, today, className }) {
    const [notifying, setNotifying] = useState(null)
    // Sent in this visit, shown right away while the page refreshes.
    const [sent, setSent] = useState({})
    const rows = students.map((student) => sent[student.student_subject_id]
        ? { ...student, notified_at: sent[student.student_subject_id] }
        : student)
    const { visible, toggle } = useShowMore(rows, 6)

    const onSent = (studentSubjectId, notifiedAt) => {
        setSent((current) => ({ ...current, [studentSubjectId]: notifiedAt }))
        setNotifying(null)
        router.reload({ only: ['dashboard'] })
    }

    return (
        <Section id="watch" title="Students to watch" meta={`Dropped at ${dropAfter} absences in a row`} className={className}>
            <ul className="divide-y">
                {visible.map((student) => (
                    <StudentRow key={student.student_subject_id} student={student} today={today} onNotify={setNotifying} />
                ))}
            </ul>
            {toggle}

            <NotifyDialog student={notifying} onClose={() => setNotifying(null)} onSent={onSent} />
        </Section>
    )
}
