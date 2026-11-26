import React, { useEffect, useId, useMemo, useRef, useState } from 'react'
import { AlertCircle, CalendarDays, Check, ClipboardList, Info, Keyboard, LoaderCircle, LockKeyhole, Maximize2, Plus, RotateCcw, Search, WifiOff, X } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/Lib/Utils'
import { Button } from '@/Components/ui/button'
import { Input } from '@/Components/ui/input'
import { Badge } from '@/Components/ui/badge'
import { Card, CardContent } from '@/Components/ui/card'
import { Label } from '@/Components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/Components/ui/dialog'
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/Components/ui/alert-dialog'
import { ToggleGroup, ToggleGroupItem } from '@/Components/ui/toggle-group'
import DatePicker from '@/Components/DatePicker'
import { usePage } from '@inertiajs/react'
import useAttendance from './AttendancePartials/useAttendance'
import { RemarksCell, TermAttendance } from './AttendancePartials/AttendanceRowDetails'
import { formatDate, meetingLabel, sessionCounts, STATUSES, studentName, suggestedDates, typingIn } from './AttendancePartials/attendanceUtils'
import AttendanceExport from './AttendancePartials/AttendanceExport.jsx'
import RatesInfo from './AttendancePartials/RatesInfo'
import RosterFullScreen from './AttendancePartials/RosterFullScreen'
import { attendanceGuide, Key } from './AttendancePartials/attendanceGuide'
import { GuideButton, useGuide } from './Classwork/Shared/GuideTour'
import './AttendancePartials/attendance.css'
const periods = [{ value: 'midterm', label: 'Midterm' }, { value: 'final', label: 'Final' }]
const filterLabels = { unmarked: 'Unmarked', ...Object.fromEntries(STATUSES.map((status) => [status.value, status.label])) }
const rowGrid = 'attendance-row-grid'
// The theme's red is too dark to read as text in dark mode.
const dangerText = 'text-destructive dark:text-red-400'
import AttendanceMeetingStrip from './AttendancePartials/AttendanceMeetingStrip'
import AttendanceSummaryCards from './AttendancePartials/AttendanceSummaryCards'
import { Alert, AlertDescription, AlertTitle } from '@/Components/ui/alert'

function MeetingCounts({ session }) {
    return <span className="mt-2 grid w-full grid-cols-2 gap-x-3 gap-y-1 text-xs">
        {STATUSES.map(({ value, label }) => <span key={value} className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-semibold tabular-nums">{Number(session[`${value}_count`] || 0)}</span>
        </span>)}
    </span>
}

// The grading period this teacher last picked for a new meeting, so the next
// one starts there. Kept per teacher in this browser.
const periodKey = (userId) => `attendance:new-meeting-period:${userId}`

function savedPeriod(userId) {
    try {
        const value = window.localStorage.getItem(periodKey(userId))
        return periods.some((item) => item.value === value) ? value : null
    } catch {
        return null
    }
}

function savePeriod(userId, value) {
    try {
        window.localStorage.setItem(periodKey(userId), value)
    } catch {
        // Private browsing or blocked storage: the choice just isn't remembered.
    }
}

const periodLabel = (value) => periods.find((item) => item.value === value)?.label

// The grading period a meeting counts toward. One added under the wrong
// period moves with a click and keeps its marks; locked meetings keep theirs.
function PeriodSwitch({ attendance: a }) {
    const id = useId()
    const current = a.session.period
    // The period being saved shows right away; a failed save goes back.
    const [saving, setSaving] = useState(null)

    async function change(next) {
        // Clicking the chosen period again leaves it chosen.
        if (!next || next === current || saving) return
        setSaving(next)
        try {
            if (await a.setPeriod(next)) toast.success(`Meeting moved to ${periodLabel(next)}.`)
        } finally {
            setSaving(null)
        }
    }

    return <div className="flex items-center gap-2" data-tour="attendance-period">
        <span id={`${id}-label`} className="text-xs text-muted-foreground">Grading period</span>
        <ToggleGroup type="single" value={saving ?? current} onValueChange={change} aria-labelledby={`${id}-label`}
            disabled={!a.online || a.pending || a.busy} className="gap-1">
            {periods.map((item) => <ToggleGroupItem key={item.value} value={item.value} variant="outline"
                // The chosen period is filled; the other stays quiet, so the
                // choice reads right in light and dark mode.
                className="h-8 px-3 text-xs font-normal text-muted-foreground data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:font-semibold data-[state=on]:text-primary-foreground data-[state=on]:hover:bg-primary/90 data-[state=on]:hover:text-primary-foreground">
                {item.label}
            </ToggleGroupItem>)}
        </ToggleGroup>
    </div>
}

// Roster shortcuts. A status key marks the current student and moves to the
// next one; clearing stays put so the student can be marked again.
const STATUS_KEYS = new Map([['p', 'present'], ['1', 'present'], ['l', 'late'], ['2', 'late'], ['a', 'absent'], ['3', 'absent'], ['e', 'excused'], ['4', 'excused']])
const CLEAR_KEYS = new Set(['Backspace', 'Delete', '0'])
const rowKey = (row) => String(row.student_subject_id)

// Shown where there's likely a keyboard: a mouse or trackpad is the pointer.
function ShortcutLegend({ id }) {
    return <>
        <p id={id} className="sr-only">
            On a student, press P, L, A or E to mark them Present, Late, Absent or Excused and move to the next student.
            Backspace clears a mark, the up and down arrows move between students, and R writes a remark.
        </p>
        <div aria-hidden="true" data-tour="attendance-keys"
            className="hidden flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground [@media(pointer:fine)]:flex">
            <span className="flex items-center gap-1.5 font-medium text-foreground"><Keyboard className="size-3.5" />Keyboard</span>
            {STATUSES.map((status) => <span key={status.value} className="flex items-center gap-1"><Key>{status.short}</Key>{status.label}</span>)}
            <span className="flex items-center gap-1"><Key>⌫</Key>Clear</span>
            <span className="flex items-center gap-1"><Key>↑</Key><Key>↓</Key>Move</span>
            <span className="flex items-center gap-1"><Key>R</Key>Remarks</span>
        </div>
    </>
}

function NewMeeting({ open, onClose, attendance: a, initialPeriod }) {
    const id = useId()
    const userId = usePage().props.auth.user.id
    const [date, setDate] = useState('')
    const [number, setNumber] = useState(1)
    const [period, setPeriod] = useState(initialPeriod)
    const thisYear = new Date().getFullYear()
    const suggestions = suggestedDates(a.scheduleDay, a.today, a.sessions)
    useEffect(() => {
        if (open) {
            setDate(a.today)
            setNumber(1)
            setPeriod(savedPeriod(userId) ?? (periods.some((item) => item.value === initialPeriod) ? initialPeriod : 'midterm'))
        }
    }, [open, a.today, initialPeriod, userId])
    return <Dialog open={open} onOpenChange={(next) => { if (!next && !a.busy) onClose() }}>
        <DialogContent className="sm:max-w-lg">
            <DialogHeader><DialogTitle>Add a meeting</DialogTitle>
                <DialogDescription>Choose the grading period and meeting date. You can take attendance immediately.</DialogDescription>
            </DialogHeader>
            <form className="space-y-4" onSubmit={async (event) => {
                event.preventDefault()
                if (await a.create({ attendance_date: date, session_number: Number(number), period })) onClose()
            }}>
                <div className="space-y-2">
                    <Label id={`${id}-period`}>Grading period</Label>
                    <ToggleGroup type="single" value={period} disabled={a.busy} aria-labelledby={`${id}-period`}
                        className="grid grid-cols-2 gap-2"
                        onValueChange={(next) => {
                            // Clicking the chosen period again leaves it chosen.
                            if (!next) return
                            setPeriod(next)
                            savePeriod(userId, next)
                        }}>
                        {periods.map((item) => <ToggleGroupItem key={item.value} value={item.value} variant="outline"
                            className="h-10 data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:hover:bg-primary/90 data-[state=on]:hover:text-primary-foreground">
                            {item.label}
                        </ToggleGroupItem>)}
                    </ToggleGroup>
                </div>
                <div className="space-y-2">
                    <p className="text-sm font-medium">Class schedule: {a.scheduleDay || 'Not set'}</p>
                    <div className="flex flex-wrap gap-2">
                        {suggestions.map((value) => <Button key={value} type="button" size="sm" disabled={a.busy}
                            variant={date === value ? 'default' : 'outline'} onClick={() => setDate(value)}>{formatDate(value, true)}</Button>)}
                    </div>
                    <p className="text-xs text-muted-foreground">Suggestions follow the class days. Holidays and makeup classes can be selected manually.</p>
                </div>
                <div className="space-y-2"><Label id={`${id}-date-label`} htmlFor={`${id}-date`}>Meeting date</Label>
                    <DatePicker id={`${id}-date`} labelledBy={`${id}-date-label`} value={date} onChange={setDate}
                        required disabled={a.busy} className="h-10"
                        startMonth={new Date(thisYear - 1, 0)} endMonth={new Date(thisYear + 1, 11)} /></div>
                <div className="space-y-2"><Label htmlFor={`${id}-number`}>Meeting number</Label>
                    <Input id={`${id}-number`} type="number" required min={1} max={65535} step={1} value={number}
                        disabled={a.busy} onChange={(event) => setNumber(event.target.value)} /></div>
                <p className="text-xs text-muted-foreground">Use meeting 2 for another meeting on the same date. Attendance stays editable until you permanently lock the meeting.</p>
                {a.error && <p role="alert" className={cn('text-sm', dangerText)}>{a.error}</p>}
                <DialogFooter><Button type="button" variant="outline" disabled={a.busy} onClick={onClose}>Cancel</Button>
                    <Button type="submit" disabled={a.busy || !a.online || !date}>{a.busy && <LoaderCircle className="size-4 animate-spin" />}Add meeting</Button></DialogFooter>
            </form>
        </DialogContent>
    </Dialog>
}

function ConflictReview({ attendance: a }) {
    const review = a.review
    const [resolving, setResolving] = useState(false)
    const latest = new Map((review?.latest.records || []).map((row) => [String(row.student_subject_id), row]))
    const canKeep = review && !review.latest.session.locked_at && review.latest.session.status === 'open'
    async function resolve(keep) {
        setResolving(true)
        try { await a.resolveReview(keep) } finally { setResolving(false) }
    }
    return <Dialog open={Boolean(review)} onOpenChange={(open) => { if (!open && !resolving) a.closeReview() }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
            <DialogHeader><DialogTitle>Review pending changes</DialogTitle>
                <DialogDescription>Compare this device’s changes with the latest saved records. Keep my changes submits them again. Use server records discards this device’s pending changes.</DialogDescription></DialogHeader>
            {review?.latest.session.locked_at && <p className={cn('text-sm font-medium', dangerText)}>This meeting is permanently locked. Pending edits cannot be submitted.</p>}
            <div className="space-y-3">{review?.rows.filter((row) => review.doc.patches[String(row.student_subject_id)]).map((row) => {
                const server = latest.get(String(row.student_subject_id))
                const fields = Object.keys(review.doc.patches[String(row.student_subject_id)])
                return <Card key={row.student_subject_id} className="py-0 shadow-none"><CardContent className="space-y-1 p-3 text-sm">
                    <p className="font-medium">{studentName(row)}</p>
                    {fields.map((field) => <p key={field}><span className="capitalize">{field}:</span>{' '}
                        <span className="text-muted-foreground">Server: {server?.[field] || '—'}</span>{' · '}
                        This device: {row[field] || '—'}</p>)}
                </CardContent></Card>
            })}</div>
            {a.error && <p role="alert" className={cn('text-sm', dangerText)}>{a.error}</p>}
            <DialogFooter>
                <Button type="button" variant="outline" disabled={resolving} onClick={a.closeReview}>Decide later</Button>
                <Button type="button" variant="outline" disabled={resolving || !a.online} onClick={() => resolve(false)}>Use server records</Button>
                {canKeep && <Button type="button" disabled={resolving || !a.online} onClick={() => resolve(true)}>Keep my changes</Button>}
            </DialogFooter>
        </DialogContent>
    </Dialog>
}

function Confirmation({ action, attendance: a, onClose, onClear }) {
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState('')
    const inFlight = useRef(false)
    const isBusy = submitting || a.busy || Boolean(a.writing)
    const isLock = action === 'lock'
    const isClear = action === 'clear'
    const marked = a.stats.marked
    const descriptions = {
        clear: [`Clear ${marked} attendance ${marked === 1 ? 'mark' : 'marks'}?`, 'These students will become Unmarked, including students hidden by search or filters. Remarks will stay.'],
        cancel: ['Cancel this meeting?', 'Records are kept but excluded from attendance rates. You can restore an unlocked meeting later.'],
        lock: ['Permanently lock this meeting?', `Attendance and remarks for all ${a.stats.total} students will become read-only.`],
    }
    const text = descriptions[action] || descriptions.clear
    const canConfirm = Boolean(action && a.session && !isBusy && !a.locked && (
        isClear ? a.editable && marked > 0
            : a.online && !a.pending && (isLock
                ? a.session.status === 'open' && a.session.roster_initialized_at && a.stats.unmarked === 0
                : a.session.status === 'open')
    ))
    useEffect(() => { setError('') }, [action])

    async function confirm() {
        if (!canConfirm || inFlight.current) return
        inFlight.current = true
        setSubmitting(true)
        setError('')
        try {
            const success = isClear ? await onClear() : isLock ? await a.lock() : await a.setStatus('cancelled')
            if (success) onClose()
        } catch (failure) {
            setError(failure.message || 'Unable to complete this action. Please try again.')
        } finally {
            inFlight.current = false
            setSubmitting(false)
        }
    }
    return (
        <AlertDialog open={Boolean(action)} onOpenChange={(open) => { if (!open && !isBusy) onClose() }}>
            <AlertDialogContent className="max-h-[85vh] overflow-y-auto">
                <AlertDialogHeader>
                    {isLock && (
                        <LockKeyhole
                            aria-hidden="true"
                            className="mb-2 size-8 text-amber-700 dark:text-amber-300"
                        />
                    )}
                    <AlertDialogTitle>{text[0]}</AlertDialogTitle>
                    <AlertDialogDescription>{text[1]}</AlertDialogDescription>
                </AlertDialogHeader>

                {a.session && <div className="space-y-2 rounded-lg border bg-muted/30 p-3 text-sm">
                    <div>
                        <p className="font-medium">{formatDate(a.session.attendance_date)}</p>
                        <p className="text-xs text-muted-foreground">
                            {periodLabel(a.session.period)} · Meeting {a.session.session_number}
                        </p>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                        {STATUSES.map(({ value, label }) => <span key={value} className="flex justify-between gap-2">
                            <span className="text-muted-foreground">{label}</span>
                            <span className="font-medium tabular-nums">{a.stats[value]}</span>
                        </span>)}
                    </div>
                </div>}

                {isLock && (
                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-900 dark:text-amber-200">
                        <p className="font-semibold">
                            This cannot be undone.
                        </p>

                        <p className="mt-1">
                            You will not be able to unlock, edit, cancel,
                            or reopen this meeting.
                        </p>
                    </div>
                )}

                {isClear && <p className="text-sm text-muted-foreground">
                    Changes autosave. Use Undo in the attendance toolbar before another edit or leaving this meeting.
                </p>}

                {(error || a.error) && <p role="alert" className={cn('text-sm', dangerText)}>{error || a.error}</p>}

                <AlertDialogFooter>
                    <AlertDialogCancel autoFocus disabled={isBusy} onClick={onClose}>
                        {isLock ? 'Keep editable' : 'Go back'}
                    </AlertDialogCancel>
                    <Button type="button" variant={isLock ? 'default' : 'destructive'} disabled={!canConfirm} onClick={confirm}>
                        {submitting && <LoaderCircle className="size-4 animate-spin" />}
                        {isLock ? 'Lock permanently' : isClear ? `Clear ${marked} ${marked === 1 ? 'mark' : 'marks'}` : 'Cancel meeting'}
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}

export default function Attendance({ classId, initialPeriod = 'midterm', section }) {
    // return (
    //     <div className="flex min-h-[320px] w-full items-center justify-center p-4 sm:p-6">
    //         <Card className="w-full max-w-md rounded-2xl border-dashed bg-muted/20 py-0 shadow-none">
    //             <CardContent className="flex flex-col items-center px-6 py-10 text-center sm:px-10">
    //                 <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
    //                     <ClipboardList
    //                         aria-hidden="true"
    //                         className="h-8 w-8"
    //                         strokeWidth={1.5}
    //                     />
    //                 </div>

    //                 <Badge
    //                     variant="secondary"
    //                     className="mb-3 gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
    //                 >
    //                     <span
    //                         aria-hidden="true"
    //                         className="h-1.5 w-1.5 rounded-full bg-primary"
    //                     />
    //                     In development
    //                 </Badge>

    //                 <h3 className="text-lg font-semibold tracking-tight text-foreground">
    //                     Not complete yet
    //                 </h3>

    //                 <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
    //                     The attendance module is still being developed.
    //                     Please check back for updates.
    //                 </p>
    //             </CardContent>
    //         </Card>
    //     </div>
    // )


    const [search, setSearch] = useState('')
    const [filter, setFilter] = useState('all')
    const [newMeeting, setNewMeeting] = useState(false)
    const [confirmation, setConfirmation] = useState(null)
    const [undo, setUndo] = useState(null)
    // The student the keyboard marks: the last row focused.
    const [activeId, setActiveId] = useState(null)
    const rowNodes = useRef(new Map())
    const keysId = useId()
    // Full screen: the list fills the screen, and the browser's own full
    // screen too where it's allowed. The page keeps the list's height
    // meanwhile, so nothing jumps on the way back.
    const [fullScreen, setFullScreen] = useState(false)
    const [placeholder, setPlaceholder] = useState(0)
    const fullScreenOpen = useRef(false)
    const ownsBrowserFullScreen = useRef(false)
    const workRef = useRef(null)
    const fullScreenButton = useRef(null)
    const a = useAttendance({ classId })
    useEffect(() => { setSearch(''); setFilter('all'); setUndo(null); setConfirmation(null); setActiveId(null) }, [classId, a.session?.id])
    const visible = useMemo(() => a.rows.filter((row) =>
        `${studentName(row)} ${row.user_id_no || ''}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()) &&
        (filter === 'all' || (row.status || 'unmarked') === filter)), [a.rows, search, filter])
    const hasRoster = Boolean(a.session?.roster_initialized_at)
    // Tab lands on the current student, or the first one left to mark.
    const tabStop = visible.some((row) => rowKey(row) === activeId)
        ? activeId
        : visible.length ? rowKey(visible.find((row) => !row.status) ?? visible[0]) : null
    // Why Lock meeting is greyed out, shown beside it: a tooltip wouldn't
    // appear on a disabled button.
    const lockHintId = useId()
    const lockHint = !hasRoster ? 'Start attendance first'
        : a.stats.unmarked > 0 ? `Mark ${a.stats.unmarked} more to lock`
            : a.pending ? 'Locking waits for sync'
                : !a.online ? 'Locking needs internet' : ''
    const guide = useGuide({
        guide: 'attendance',
        steps: () => attendanceGuide({ keyboard: window.matchMedia?.('(pointer: fine)').matches ?? true }),
        ready: hasRoster && !a.loading && !newMeeting && !fullScreen,
    })
    async function bulk(clear = false) {
        const targets = a.rows.filter((row) => clear ? row.status !== null : !row.status)
        if (!targets.length) return false
        const snapshot = targets.map((row) => ({ id: row.student_subject_id, values: { status: row.status } }))
        const edits = targets.map((row) => ({ id: row.student_subject_id, values: { status: clear ? null : 'present' } }))
        const success = await a.patchMany(edits)
        if (success) setUndo(snapshot)
        return success
    }
    function edit(studentId, values) { setUndo(null); return a.patch(studentId, values) }

    function focusRow(index) {
        const row = visible[Math.min(Math.max(index, 0), visible.length - 1)]
        const node = row && rowNodes.current.get(rowKey(row))
        if (!node) return
        setActiveId(rowKey(row))
        node.focus({ preventScroll: true })
        node.scrollIntoView({ block: 'nearest' })
    }

    function rosterKeys(event) {
        if (event.ctrlKey || event.metaKey || event.altKey || event.nativeEvent.isComposing || typingIn(event.target)) return
        const node = event.target.closest('[data-attendance-row]')
        const index = node ? visible.findIndex((row) => rowKey(row) === node.dataset.attendanceRow) : -1
        if (index < 0) return
        const row = visible[index]
        const key = event.key.length === 1 ? event.key.toLowerCase() : event.key
        const status = STATUS_KEYS.has(key) ? STATUS_KEYS.get(key) : CLEAR_KEYS.has(key) ? null : undefined

        if (status !== undefined) {
            event.preventDefault()
            // Holding a key down mustn't run through the whole class.
            if (event.repeat || !a.editable) return
            if ((row.status ?? null) !== status) edit(row.student_subject_id, { status })
            if (status) focusRow(index + 1)
            return
        }

        const moves = new Map([['ArrowDown', index + 1], ['ArrowUp', index - 1], ['Home', 0], ['End', visible.length - 1]])
        if (moves.has(key)) {
            event.preventDefault()
            focusRow(moves.get(key))
        } else if (key === 'r' && a.editable) {
            event.preventDefault()
            node.querySelector('[data-remarks-trigger]')?.click()
        }
    }

    async function openFullScreen() {
        // Layout height, not screen position: the marked bar may be stuck to
        // the bottom of the window.
        setPlaceholder(workRef.current?.offsetHeight ?? 0)
        fullScreenOpen.current = true
        setFullScreen(true)

        // Not every browser allows it (iPhones don't); the view still fills the window.
        if (!document.fullscreenEnabled || document.fullscreenElement) return
        try {
            await document.documentElement.requestFullscreen()
            ownsBrowserFullScreen.current = true
            // Closed again before the browser got there.
            if (!fullScreenOpen.current) leaveBrowserFullScreen()
        } catch {
            // Refused: the view still fills the window.
        }
    }

    function leaveBrowserFullScreen() {
        if (ownsBrowserFullScreen.current && document.fullscreenElement) void document.exitFullscreen().catch(() => { })
        ownsBrowserFullScreen.current = false
    }

    function exitFullScreen() {
        fullScreenOpen.current = false
        setFullScreen(false)
        leaveBrowserFullScreen()
    }

    // Leaving the browser's full screen (Esc, F11) leaves the view too.
    useEffect(() => {
        if (!fullScreen) return undefined
        const changed = () => {
            if (ownsBrowserFullScreen.current && !document.fullscreenElement) {
                ownsBrowserFullScreen.current = false
                fullScreenOpen.current = false
                setFullScreen(false)
            }
        }
        document.addEventListener('fullscreenchange', changed)
        return () => document.removeEventListener('fullscreenchange', changed)
    }, [fullScreen])

    // A meeting without a list has nothing to show full screen.
    useEffect(() => {
        if (fullScreen && !(a.session && hasRoster)) exitFullScreen()
    })

    useEffect(() => () => leaveBrowserFullScreen(), [])

    // Full screen opens on the current student, and closing goes back to them.
    function focusCurrent(event) {
        const node = tabStop && rowNodes.current.get(tabStop)
        if (!node) return
        event.preventDefault()
        node.focus({ preventScroll: true })
        node.scrollIntoView({ block: 'nearest' })
    }

    function focusAfterFullScreen(event) {
        event.preventDefault()
        const node = (tabStop && rowNodes.current.get(tabStop)) || fullScreenButton.current
        node?.focus({ preventScroll: true })
        node?.scrollIntoView({ block: 'nearest' })
    }

    const blockedBanner = a.blocked && <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-400/50 bg-amber-50 p-3 text-sm dark:bg-amber-950">
        <p className="flex-1">{a.blocked.message} Your pending changes are kept on this device.</p>
        {[409, 423].includes(a.blocked.status) ? <Button type="button" variant="outline" disabled={!a.online} onClick={a.openReview}>Review changes</Button>
            : <Button type="button" variant="outline" disabled={!a.online} onClick={a.retry}>Retry sync</Button>}
    </div>

    // The toolbar, shortcuts, list and marked count: on the page, or filling
    // the screen (`full`), where the status counts come along as the filter.
    function workArea(full) {
        const progress = a.stats.total ? Math.round(a.stats.marked / a.stats.total * 100) : 0

        return <>
            {full && <AttendanceSummaryCards compact stats={a.stats} filter={filter} onFilterChange={setFilter}
                cancelled={a.session.status === 'cancelled'} />}
            <div className="flex flex-wrap gap-2">
                <div className="relative min-w-48 flex-1"><Search className="absolute left-3 top-3 size-4 text-muted-foreground" /><Input className="h-10 pl-9" aria-label="Search students" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or student number…" /></div>
                {/* The status counts are the filter; this says which one is on. */}
                {filter !== 'all' && <Button type="button" variant="secondary" className="h-10 gap-1.5"
                    aria-label={`Showing ${filterLabels[filter]} only. Show all students.`} onClick={() => setFilter('all')}>
                    {filterLabels[filter]} only<X aria-hidden="true" className="size-4" />
                </Button>}
                <Button type="button" variant="outline" className="h-10" disabled={!a.editable || !a.stats.unmarked} data-tour="attendance-bulk" onClick={() => bulk(false)}>Mark unmarked present</Button>
                <Button type="button" variant="ghost" className="h-10" disabled={!a.editable || !a.stats.marked} onClick={() => setConfirmation('clear')}>Clear marks</Button>
                {undo && <Button type="button" variant="outline" disabled={!a.editable} onClick={async () => { if (await a.patchMany(undo)) setUndo(null) }}>Undo</Button>}
            </div>
            {(a.editable || !full) && <div className="flex items-center gap-3">
                {a.editable && <ShortcutLegend id={keysId} />}
                {!full && <Button ref={fullScreenButton} type="button" variant="outline" size="sm" className="ml-auto h-8"
                    data-tour="attendance-fullscreen" onClick={openFullScreen}>
                    <Maximize2 aria-hidden="true" className="size-4" />Full screen
                </Button>}
            </div>}
            {/* Rows take focus themselves (Tab lands on the current student).
                On the page the list grows and the page scrolls; full screen
                gives the list its own scroll. */}
            <div
                className="attendance-roster rounded-xl border"
                data-full-screen={full ? '' : undefined}
                role="region"
                aria-label="Student attendance list"
                aria-describedby={a.editable ? keysId : undefined}
            >
                <div role="table" aria-label="Student attendance">
                <div role="rowgroup" className="attendance-table-head sticky z-10 hidden border-b bg-background shadow-sm"><div role="row" className={`grid items-center gap-3 px-4 py-2 text-xs font-medium text-muted-foreground ${rowGrid}`}>
                    <span role="columnheader">Student</span>
                    <span role="columnheader" className="flex items-center gap-1">Term attendance<RatesInfo className="-my-1" /></span>
                    <span role="columnheader">Status</span>
                    <span role="columnheader">Remarks</span>
                </div>
                </div>
                {/* Only the current student's row and its buttons are in the Tab
                    order; the arrow keys move between students. */}
                <div role="rowgroup" onKeyDown={rosterKeys}>{visible.map((row, index) => {
                    const stop = rowKey(row) === tabStop
                    return <div role="row" key={row.student_subject_id}
                    ref={(node) => { if (node) rowNodes.current.set(rowKey(row), node); else rowNodes.current.delete(rowKey(row)) }}
                    data-attendance-row={rowKey(row)} data-tour={index === 0 ? 'attendance-row' : undefined}
                    tabIndex={stop ? 0 : -1} onFocus={() => setActiveId(rowKey(row))}
                    className={`attendance-row group grid gap-3 border-t px-4 py-4 outline-none focus-within:bg-muted/40 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${rowGrid}`}>
                    <div role="cell"><p className="text-sm font-medium">{studentName(row)}</p><p className="text-xs text-muted-foreground">{row.user_id_no || 'No student number'}</p></div>
                    <div role="cell" className="text-sm">
                        <span className="attendance-term-label mr-1 text-xs text-muted-foreground">Term attendance:</span>
                        <TermAttendance row={row} />
                    </div>
                    <div role="cell"><div role="group" aria-label={`Attendance status for ${studentName(row)}`} className="grid grid-cols-4 gap-1.5">
                        {STATUSES.map((status) => {
                            const chosen = row.status === status.value
                            return <Button type="button" variant="outline" key={status.value} disabled={!a.editable}
                                tabIndex={stop ? undefined : -1}
                                aria-label={`${status.label} for ${studentName(row)}`} aria-pressed={chosen}
                                // Only the chosen status is coloured; the others stay
                                // quiet until hovered, so the answers stand out.
                                className={cn('attendance-status h-10 gap-1 px-1 text-xs', chosen
                                    ? cn(status.tone, 'font-semibold')
                                    : cn('border-border/60 bg-transparent font-normal text-muted-foreground', status.hover))}
                                onClick={() => edit(row.student_subject_id, { status: chosen ? null : status.value })}>
                                {chosen && <Check className="size-3" />}{status.label}
                            </Button>
                        })}
                    </div></div>
                    <div role="cell" className="min-w-0">
                        <RemarksCell key={`${a.session.id}:${row.student_subject_id}`} row={row} editable={a.editable}
                            tabIndex={stop ? undefined : -1}
                            onChange={(remarks) => edit(row.student_subject_id, { remarks })} />
                    </div>
                </div>
                })}</div>
                </div>
                {!visible.length && <p className="p-6 text-center text-sm text-muted-foreground">No students match this view.</p>}
            </div>
            <footer className={cn(
                'flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border px-4 py-3 shadow-sm',
                // On the page it stays in view while the list scrolls; full
                // screen keeps it at the bottom.
                full ? 'mt-auto rounded-xl bg-background' : 'sticky bottom-0 z-20 rounded-t-xl bg-background/95 backdrop-blur',
            )}>
                <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                    <p className="text-sm">{a.stats.marked} of {a.stats.total} marked · {a.stats.unmarked} remaining</p>
                    <div role="progressbar" aria-label="Students marked" aria-valuemin={0} aria-valuemax={a.stats.total} aria-valuenow={a.stats.marked}
                        className="h-1.5 w-24 overflow-hidden rounded-full bg-muted sm:w-40">
                        <div className="h-full rounded-full bg-primary motion-safe:transition-[width]" style={{ width: `${progress}%` }} />
                    </div>
                </div>
                <p role="status" aria-live="polite" className={`flex items-center gap-2 text-sm ${a.blocked || a.writeError ? dangerText : a.pending ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300'}`}>
                    {a.syncLabel === 'Syncing…' ? <LoaderCircle className="size-4 animate-spin" /> : a.pending ? <AlertCircle className="size-4" /> : <Check className="size-4" />}{a.syncLabel}
                </p>
            </footer>
        </>
    }

    return <section
        className="attendance-panel min-w-0 w-full max-w-full space-y-4"
        aria-label="Class attendance"
    >
        {!a.online && (
            <Card
                role="alert"
                aria-atomic="true"
                className="border-amber-500/40 bg-amber-50 py-0 shadow-none dark:bg-amber-950/30"
            >
                <CardContent className="flex items-start gap-3 p-4">
                    <WifiOff
                        aria-hidden="true"
                        className="mt-0.5 size-5 shrink-0 text-amber-700 dark:text-amber-300"
                    />

                    <div className="min-w-0 space-y-1">
                        <p className="text-sm font-semibold text-amber-950 dark:text-amber-100">
                            You’re offline — keep this tab open
                        </p>

                        <p className="text-sm text-amber-900 dark:text-amber-200">
                            Avoid refreshing or closing this page. The website
                            may not load again until your internet connection
                            returns.
                        </p>

                        <p className="text-xs text-amber-800 dark:text-amber-300">
                            Changes saved on this device will sync automatically
                            when the connection returns. Adding meetings and
                            changing a meeting’s grading period need internet.
                        </p>
                    </div>
                </CardContent>
            </Card>
        )}{a.error && <div role="alert" className={cn('rounded-lg border border-destructive/30 p-3 text-sm', dangerText)}>{a.error}</div>}
        {a.loading && <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" />Loading attendance…</p>}
        <AttendanceMeetingStrip
            attendance={a}
            classId={classId}
            onAdd={() => setNewMeeting(true)}
        />
        {!a.loading && !a.sessions.length && <Card className="border-dashed shadow-none"><CardContent className="py-10 text-center"><CalendarDays className="mx-auto mb-2 size-8 text-muted-foreground" />No meetings yet. Add one using your class schedule.</CardContent></Card>}
        {a.session && <>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                    <div><h3 className="font-semibold">{formatDate(a.session.attendance_date)}</h3><p className="text-xs text-muted-foreground">{a.locked && `${periodLabel(a.session.period)} · `}Meeting {a.session.session_number} · {a.stats.total} students</p></div>
                    {!a.locked && <PeriodSwitch attendance={a} />}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <GuideButton onClick={guide.start} data-tour="guide-attendance" />
                    <AttendanceExport key={classId} attendance={a} section={section} />
                    {/* <Button type="button" variant="outline" size="icon" aria-label="Refresh" title="Refresh attendance"
                        disabled={!a.online || a.busy} onClick={a.refresh}><RotateCcw className="size-4" /></Button> */}
                    {a.locked ? <Badge variant="secondary"><LockKeyhole className="mr-1 size-3" />Permanently locked</Badge>
                        : <div className="flex flex-wrap items-center gap-2">
                            {a.session.status === 'cancelled' ? <Button type="button" variant="outline" disabled={!a.online || a.pending || a.busy} onClick={() => a.setStatus('open')}>Restore meeting</Button>
                                : <><Button
                                    type="button"
                                    variant="ghost"
                                    className={cn(dangerText, 'hover:bg-destructive/10 hover:text-destructive dark:hover:text-red-300')}
                                    disabled={!a.online || a.pending || a.busy}
                                    onClick={() => setConfirmation('cancel')}
                                >
                                    Cancel meeting
                                </Button>
                                    {lockHint && <span id={lockHintId} className="text-xs text-muted-foreground">{lockHint}</span>}
                                    <Button type="button" variant="outline" disabled={Boolean(lockHint) || a.busy}
                                        data-tour="attendance-lock" aria-describedby={lockHint ? lockHintId : undefined}
                                        onClick={() => setConfirmation('lock')}><LockKeyhole className="size-4" />Lock meeting</Button></>}
                        </div>}
                </div>
            </div>
            {blockedBanner}
            {a.unavailableOffline && <p className="rounded-lg border p-4 text-sm">This roster has not been loaded on this device. Open it while connected first.</p>}
            {!hasRoster && !a.locked && a.session.status === 'open' && <Button type="button" variant="outline" disabled={!a.online || a.busy} onClick={a.start}>Start attendance</Button>}
            {hasRoster && <>
                <AttendanceSummaryCards
                    stats={a.stats}
                    filter={filter}
                    onFilterChange={setFilter}
                    cancelled={a.session.status === 'cancelled'}
                />
                {fullScreen
                    ? <div aria-hidden="true" style={{ height: placeholder }} />
                    : <div ref={workRef} className="space-y-4">{workArea(false)}</div>}
            </>}
        </>}
        <NewMeeting open={newMeeting} onClose={() => setNewMeeting(false)} attendance={a} initialPeriod={a.session?.period || initialPeriod} />
        <Confirmation action={confirmation} attendance={a} onClose={() => setConfirmation(null)} onClear={() => bulk(true)} />
        <ConflictReview attendance={a} />
        {a.session && hasRoster && <RosterFullScreen
            open={fullScreen}
            onExit={exitFullScreen}
            title={formatDate(a.session.attendance_date)}
            description={`${periodLabel(a.session.period)} · Meeting ${a.session.session_number} · ${a.stats.total} students`}
            offline={!a.online}
            onOpenAutoFocus={focusCurrent}
            onCloseAutoFocus={focusAfterFullScreen}
        >
            {a.error && <div role="alert" className={cn('rounded-lg border border-destructive/30 p-3 text-sm', dangerText)}>{a.error}</div>}
            {blockedBanner}
            {fullScreen && workArea(true)}
        </RosterFullScreen>}
        {guide.tour}
    </section>
}
