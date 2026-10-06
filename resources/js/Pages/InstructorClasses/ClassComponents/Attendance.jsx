import React, { useEffect, useId, useMemo, useRef, useState } from 'react'
import { AlertCircle, CalendarDays, Check, LoaderCircle, LockKeyhole, Plus, RotateCcw, Search, WifiOff } from 'lucide-react'
import { Button } from '@/Components/ui/button'
import { Input } from '@/Components/ui/input'
import { Badge } from '@/Components/ui/badge'
import { Card, CardContent } from '@/Components/ui/card'
import { Label } from '@/Components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/Components/ui/dialog'
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/Components/ui/alert-dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select'
import useAttendance from './AttendancePartials/useAttendance'
import { RemarksCell, TermAttendance } from './AttendancePartials/AttendanceRowDetails'
import { formatDate, meetingLabel, sessionCounts, STATUSES, studentName, suggestedDates } from './AttendancePartials/attendanceUtils'
import AttendanceExport from './AttendancePartials/AttendanceExport.jsx'
import './AttendancePartials/attendance.css'
const periods = [{ value: 'midterm', label: 'Midterm' }, { value: 'final', label: 'Final' }]
const filters = [{ value: 'all', label: 'All students' }, { value: 'unmarked', label: 'Unmarked' }, ...STATUSES]
const rowGrid = 'attendance-row-grid'
import AttendanceMeetingStrip from './AttendancePartials/AttendanceMeetingStrip'
import AttendanceSummaryCards from './AttendancePartials/AttendanceSummaryCards'

function Choice({ id, label, value, options, onChange, disabled }) {
    return <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger id={id} aria-label={label} className="h-10 w-auto min-w-32">
            <SelectValue>{options.find((item) => item.value === value)?.label}</SelectValue>
        </SelectTrigger>
        <SelectContent>{options.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
    </Select>
}

function MeetingCounts({ session }) {
    return <span className="mt-2 grid w-full grid-cols-2 gap-x-3 gap-y-1 text-xs">
        {STATUSES.map(({ value, label }) => <span key={value} className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-semibold tabular-nums">{Number(session[`${value}_count`] || 0)}</span>
        </span>)}
    </span>
}

function NewMeeting({ open, onClose, attendance: a, initialPeriod }) {
    const id = useId()
    const [date, setDate] = useState('')
    const [number, setNumber] = useState(1)
    const [period, setPeriod] = useState(initialPeriod)
    const suggestions = suggestedDates(a.scheduleDay, a.today, a.sessions)
    useEffect(() => {
        if (open) {
            setDate(a.today)
            setNumber(1)
            setPeriod(periods.some((item) => item.value === initialPeriod) ? initialPeriod : 'midterm')
        }
    }, [open, a.today, initialPeriod])
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
                    <Label htmlFor={`${id}-period`}>Grading period</Label>
                    <Choice id={`${id}-period`} label="Grading period" value={period} options={periods}
                        disabled={a.busy} onChange={(next) => next && setPeriod(next)} />
                </div>
                <div className="space-y-2">
                    <p className="text-sm font-medium">Class schedule: {a.scheduleDay || 'Not set'}</p>
                    <div className="flex flex-wrap gap-2">
                        {suggestions.map((value) => <Button key={value} type="button" size="sm" disabled={a.busy}
                            variant={date === value ? 'default' : 'outline'} onClick={() => setDate(value)}>{formatDate(value, true)}</Button>)}
                    </div>
                    <p className="text-xs text-muted-foreground">Suggestions follow the class days. Holidays and makeup classes can be selected manually.</p>
                </div>
                <div className="space-y-2"><Label htmlFor={`${id}-date`}>Meeting date</Label>
                    <Input id={`${id}-date`} type="date" required value={date} disabled={a.busy} onChange={(event) => setDate(event.target.value)} /></div>
                <div className="space-y-2"><Label htmlFor={`${id}-number`}>Meeting number</Label>
                    <Input id={`${id}-number`} type="number" required min={1} max={65535} step={1} value={number}
                        disabled={a.busy} onChange={(event) => setNumber(event.target.value)} /></div>
                <p className="text-xs text-muted-foreground">Use meeting 2 for another meeting on the same date. Attendance stays editable until you permanently lock the meeting.</p>
                {a.error && <p role="alert" className="text-sm text-destructive">{a.error}</p>}
                <DialogFooter><Button type="button" variant="outline" disabled={a.busy} onClick={onClose}>Cancel</Button>
                    <Button type="submit" disabled={a.busy || !a.online}>{a.busy && <LoaderCircle className="size-4 animate-spin" />}Add meeting</Button></DialogFooter>
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
            {review?.latest.session.locked_at && <p className="text-sm font-medium text-destructive">This meeting is permanently locked. Pending edits cannot be submitted.</p>}
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
            {a.error && <p role="alert" className="text-sm text-destructive">{a.error}</p>}
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
                            {periods.find((period) => period.value === a.session.period)?.label} · Meeting {a.session.session_number}
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

                {(error || a.error) && <p role="alert" className="text-sm text-destructive">{error || a.error}</p>}

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
    const [search, setSearch] = useState('')
    const [filter, setFilter] = useState('all')
    const [newMeeting, setNewMeeting] = useState(false)
    const [confirmation, setConfirmation] = useState(null)
    const [undo, setUndo] = useState(null)
    const a = useAttendance({ classId })
    useEffect(() => { setSearch(''); setFilter('all'); setUndo(null); setConfirmation(null) }, [classId, a.session?.id])
    const visible = useMemo(() => a.rows.filter((row) =>
        `${studentName(row)} ${row.user_id_no || ''}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()) &&
        (filter === 'all' || (row.status || 'unmarked') === filter)), [a.rows, search, filter])
    const hasRoster = Boolean(a.session?.roster_initialized_at)
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
                            when the connection returns. Adding meetings
                            requires internet.
                        </p>
                    </div>
                </CardContent>
            </Card>
        )}{a.error && <div role="alert" className="rounded-lg border border-destructive/30 p-3 text-sm text-destructive">{a.error}</div>}
        {a.loading && <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" />Loading attendance…</p>}
        <AttendanceMeetingStrip
            attendance={a}
            classId={classId}
            onAdd={() => setNewMeeting(true)}
        />
        {!a.loading && !a.sessions.length && <Card className="border-dashed shadow-none"><CardContent className="py-10 text-center"><CalendarDays className="mx-auto mb-2 size-8 text-muted-foreground" />No meetings yet. Add one using your class schedule.</CardContent></Card>}
        {a.session && <>
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div><h3 className="font-semibold">{formatDate(a.session.attendance_date)}</h3><p className="text-xs text-muted-foreground">{periods.find((item) => item.value === a.session.period)?.label} · Meeting {a.session.session_number} · {a.stats.total} students</p></div>
                <div className="flex flex-wrap items-center gap-2">
                    <AttendanceExport key={classId} attendance={a} section={section} />
                    {/* <Button type="button" variant="outline" size="icon" aria-label="Refresh" title="Refresh attendance"
                        disabled={!a.online || a.busy} onClick={a.refresh}><RotateCcw className="size-4" /></Button> */}
                    {a.locked ? <Badge variant="secondary"><LockKeyhole className="mr-1 size-3" />Permanently locked</Badge>
                        : <div className="flex gap-2">
                            {a.session.status === 'cancelled' ? <Button type="button" variant="outline" disabled={!a.online || a.pending || a.busy} onClick={() => a.setStatus('open')}>Restore meeting</Button>
                                : <><Button
                                    type="button"
                                    variant="ghost"
                                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                    disabled={!a.online || a.pending || a.busy}
                                    onClick={() => setConfirmation('cancel')}
                                >
                                    Cancel meeting
                                </Button>
                                    <Button type="button" variant="outline" disabled={!a.online || a.pending || a.busy || !hasRoster || a.stats.unmarked > 0}
                                        title="Mark all students and wait for sync before permanently locking." onClick={() => setConfirmation('lock')}><LockKeyhole className="size-4" />Lock meeting</Button></>}
                        </div>}
                </div>
            </div>
            {a.blocked && <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border border-amber-400/50 bg-amber-50 p-3 text-sm dark:bg-amber-950">
                <p className="flex-1">{a.blocked.message} Your pending changes are kept on this device.</p>
                {[409, 423].includes(a.blocked.status) ? <Button type="button" variant="outline" disabled={!a.online} onClick={a.openReview}>Review changes</Button>
                    : <Button type="button" variant="outline" disabled={!a.online} onClick={a.retry}>Retry sync</Button>}
            </div>}
            {a.unavailableOffline && <p className="rounded-lg border p-4 text-sm">This roster has not been loaded on this device. Open it while connected first.</p>}
            {!hasRoster && !a.locked && a.session.status === 'open' && <Button type="button" variant="outline" disabled={!a.online || a.busy} onClick={a.start}>Start attendance</Button>}
            {hasRoster && <>
                <AttendanceSummaryCards
                    stats={a.stats}
                    filter={filter}
                    onFilterChange={setFilter}
                    cancelled={a.session.status === 'cancelled'}
                />
                <div className="flex flex-wrap gap-2">
                    <div className="relative min-w-48 flex-1"><Search className="absolute left-3 top-3 size-4 text-muted-foreground" /><Input className="h-10 pl-9" aria-label="Search students" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or student number…" /></div>
                    <Choice label="Filter attendance status" value={filter} options={filters} onChange={(next) => next && setFilter(next)} />
                    <Button type="button" variant="outline" className="h-10" disabled={!a.editable || !a.stats.unmarked} onClick={() => bulk(false)}>Mark unmarked present</Button>
                    <Button type="button" variant="ghost" className="h-10" disabled={!a.editable || !a.stats.marked} onClick={() => setConfirmation('clear')}>Clear marks</Button>
                    {undo && <Button type="button" variant="outline" disabled={!a.editable} onClick={async () => { if (await a.patchMany(undo)) setUndo(null) }}>Undo</Button>}
                </div>
                {/* <p className="text-xs text-muted-foreground">Bulk actions include hidden rows. Click a selected status again to unmark it.</p> */}
                <div
                    className="attendance-roster rounded-xl border"
                    role="region"
                    aria-label="Scrollable student attendance"
                    tabIndex={0}
                >
                    <div role="rowgroup" className="attendance-table-head sticky top-0 z-10 hidden border-b bg-background shadow-sm"><div role="row" className={`grid gap-3 px-4 py-3 text-xs font-medium text-muted-foreground ${rowGrid}`}>
                        {['Student', 'Term attendance', 'Status', 'Remarks'].map((name) => <span role="columnheader" key={name}>{name}</span>)}
                    </div>
                    </div>
                    <div role="rowgroup">{visible.map((row) => <div role="row" key={row.student_subject_id} className={`grid gap-3 border-t px-4 py-4 ${rowGrid}`}>
                        <div role="cell"><p className="text-sm font-medium">{studentName(row)}</p><p className="text-xs text-muted-foreground">{row.user_id_no || 'No student number'}</p>{!row.status && <Badge variant="secondary" className="mt-1 text-[11px]">Unmarked</Badge>}</div>
                        <div role="cell" className="text-sm">
                            <span className="attendance-term-label mr-1 text-xs text-muted-foreground">Term attendance:</span>
                            <TermAttendance row={row} />
                        </div>
                        <div role="cell"><div role="group" aria-label={`Attendance status for ${studentName(row)}`} className="grid grid-cols-4 gap-1.5">
                            {STATUSES.map((status) => <Button type="button" variant="outline" key={status.value} disabled={!a.editable}
                                aria-label={`${status.label} for ${studentName(row)}`} aria-pressed={row.status === status.value}
                                className={`h-10 gap-1 px-1 text-xs ${row.status === status.value ? status.tone : ''}`}
                                onClick={() => edit(row.student_subject_id, { status: row.status === status.value ? null : status.value })}>
                                {row.status === status.value && <Check className="size-3" />}{status.label}
                            </Button>)}
                        </div></div>
                        <div role="cell" className="min-w-0">
                            <RemarksCell key={`${a.session.id}:${row.student_subject_id}`} row={row} editable={a.editable}
                                onChange={(remarks) => edit(row.student_subject_id, { remarks })} />
                        </div>
                    </div>)}</div>
                    {!visible.length && <p className="p-6 text-center text-sm text-muted-foreground">No students match this view.</p>}
                </div>
                <details className="rounded-lg border p-3 text-sm"><summary className="cursor-pointer font-medium">How attendance rates work</summary>
                    <p className="mt-2 text-muted-foreground">(Present + Late) ÷ (Present + Late + Absent) × 100. Excused and unmarked students are excluded. Cancelled meetings are excluded from term attendance. Percentages are rounded. Term attendance uses synced records across Midterm and Final, including meetings marked in advance.</p>
                </details>
                <footer className="sticky bottom-0 z-20 flex flex-wrap items-center justify-between gap-2 rounded-t-xl border bg-background/95 px-4 py-3 shadow-sm backdrop-blur">
                    <p className="text-sm">{a.stats.marked} of {a.stats.total} marked · {a.stats.unmarked} remaining</p>
                    <p role="status" aria-live="polite" className={`flex items-center gap-2 text-sm ${a.blocked || a.writeError ? 'text-destructive' : a.pending ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300'}`}>
                        {a.syncLabel === 'Syncing…' ? <LoaderCircle className="size-4 animate-spin" /> : a.pending ? <AlertCircle className="size-4" /> : <Check className="size-4" />}{a.syncLabel}
                    </p>
                </footer>
            </>}
        </>}
        <NewMeeting open={newMeeting} onClose={() => setNewMeeting(false)} attendance={a} initialPeriod={a.session?.period || initialPeriod} />
        <Confirmation action={confirmation} attendance={a} onClose={() => setConfirmation(null)} onClear={() => bulk(true)} />
        <ConflictReview attendance={a} />
    </section>
}
