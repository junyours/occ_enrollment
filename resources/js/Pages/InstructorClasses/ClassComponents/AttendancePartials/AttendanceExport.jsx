import React, { useEffect, useId, useRef, useState } from 'react'
import { Download, FileSpreadsheet, LoaderCircle } from 'lucide-react'
import { Button } from '@/Components/ui/button'
import { Input } from '@/Components/ui/input'
import { Label } from '@/Components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/Components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select'
import { apiError } from './attendanceApi'

const PERIOD_OPTIONS = [
    { value: 'all', label: 'All periods' },
    { value: 'midterm', label: 'Midterm' },
    { value: 'final', label: 'Final' },
]

export default function AttendanceExport({ attendance: a, section }) {
    const id = useId()
    const [open, setOpen] = useState(false)
    const [scope, setScope] = useState('date')
    const [period, setPeriod] = useState('all')
    const [date, setDate] = useState('')
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState('')
    const inFlight = useRef(false)
    const mounted = useRef(true)
    useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
    const exportPeriod = scope === 'all' ? period : 'all'
    const meetings = a.sessions.filter((session) =>
        (scope === 'all' || session.attendance_date === date) &&
        (exportPeriod === 'all' || session.period === exportPeriod)
    )
    const blocked = !a.online ? 'Connect to the internet to download saved attendance.'
        : a.exportPending ? 'Wait for this class’s pending changes to sync. Resolve any sync errors first.'
            : a.busy || a.loading ? 'Wait for attendance to finish loading.'
                : !meetings.length ? 'There are no meetings in this selection.' : ''

    async function download() {
        if (blocked || inFlight.current) return
        inFlight.current = true
        setBusy(true)
        setError('')
        try {
            const { createAttendanceWorkbook, downloadAttendanceWorkbook } = await import('./exportAttendance')
            const data = await a.exportData(scope === 'date' ? date : null, exportPeriod)
            const workbook = await createAttendanceWorkbook(data)
            const bytes = await workbook.xlsx.writeBuffer()
            if (!mounted.current) return
            downloadAttendanceWorkbook(bytes, data, section)
            setOpen(false)
        } catch (failure) {
            if (mounted.current) setError(apiError(failure))
        } finally {
            inFlight.current = false
            if (mounted.current) setBusy(false)
        }
    }

    return (
        <>
            <Button type="button" variant="outline" onClick={() => {
                setDate(a.session?.attendance_date || a.today)
                setScope('date')
                setPeriod('all')
                setError('')
                setOpen(true)
            }}>
                <Download className="size-4" />Export Excel
            </Button>
            <Dialog open={open} onOpenChange={(next) => { if (!busy) setOpen(next) }}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Export attendance</DialogTitle>
                        <DialogDescription>Download student totals and attendance records, including remarks.</DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-2 gap-2" role="group" aria-label="Export range">
                        {[['date', 'By date'], ['all', 'All dates']].map(([value, label]) =>
                            <Button key={value} type="button" disabled={busy} aria-pressed={scope === value}
                                variant={scope === value ? 'default' : 'outline'} onClick={() => { setScope(value); setError('') }}>
                                {label}
                            </Button>)}
                    </div>
                    {scope === 'date' && <div className="space-y-2">
                        <Label htmlFor={`${id}-date`}>Meeting date</Label>
                        <Input id={`${id}-date`} type="date" value={date} disabled={busy}
                            onChange={(event) => { setDate(event.target.value); setError('') }} />
                    </div>}
                    {scope === 'all' && <div className="space-y-2">
                        <Label htmlFor={`${id}-period`}>Grading period</Label>
                        <Select value={period} disabled={busy} onValueChange={(next) => {
                            if (next) { setPeriod(next); setError('') }
                        }}>
                            <SelectTrigger id={`${id}-period`} aria-label="Grading period" className="w-full">
                                <SelectValue>{PERIOD_OPTIONS.find((option) => option.value === period)?.label}</SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                {PERIOD_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                </SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>}
                    <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                        <p className="font-medium">{meetings.length} {meetings.length === 1 ? 'meeting' : 'meetings'} included</p>
                        <p className="mt-1 text-muted-foreground">Includes every student in the selected {exportPeriod === 'all' ? 'grading periods' : `${exportPeriod} period`}. Both sheets use this selection. Search and status filters do not limit the export. Cancelled meetings remain in the records sheet and are excluded from totals.</p>
                    </div>
                    {(blocked || error) && <p role="alert" className="text-sm text-destructive">{error || blocked}</p>}
                    <DialogFooter>
                        <Button type="button" variant="outline" disabled={busy} onClick={() => setOpen(false)}>Cancel</Button>
                        <Button type="button" disabled={busy || Boolean(blocked)} onClick={download}>
                            {busy ? <LoaderCircle className="size-4 animate-spin" /> : <FileSpreadsheet className="size-4" />}
                            {busy ? 'Preparing Excel…' : 'Download Excel'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
