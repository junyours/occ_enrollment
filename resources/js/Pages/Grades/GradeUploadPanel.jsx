import React, { useEffect, useId, useState } from 'react'
import axios from 'axios'
import { formatDistanceToNowStrict } from 'date-fns'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

import { Badge } from '@/Components/ui/badge'
import { Button } from '@/Components/ui/button'
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/Components/ui/dialog'
import { cn } from '@/Lib/Utils'
import DateTimeField from './DateTimeField'

const LABEL = { midterm: 'Midterm', final: 'Final' }
const BADGE = { open: 'Open', scheduled: 'Scheduled', closed: 'Closed', not_set: 'Not open' }
const TONE = {
    open: 'border-emerald-600/30 bg-emerald-600/10 text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-300',
    scheduled: 'border-sky-600/30 bg-sky-600/10 text-sky-700 dark:border-sky-400/30 dark:bg-sky-400/10 dark:text-sky-300',
    closed: 'border-border bg-muted text-foreground',
    not_set: 'border-border bg-muted text-foreground',
}

/** The selected school year's grade upload windows, shared by the page. */
export function useGradeUpload(schoolYearId) {
    return useQuery({
        queryKey: ['grade-upload', schoolYearId],
        queryFn: async ({ signal }) => (await axios.get(`/grade-upload/${schoolYearId}`, { signal })).data,
        enabled: Boolean(schoolYearId),
    })
}

// "Fri, Dec 5, 2026, 5:00 PM", in school time.
function formatWhen(iso, timeZone) {
    return new Intl.DateTimeFormat('en-PH', {
        timeZone, weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
    }).format(new Date(iso))
}

// ISO time → { date: 'yyyy-MM-dd', time: 'HH:mm' } in school time.
function toParts(iso, timeZone) {
    if (!iso) return { date: '', time: '' }
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date(iso))
    const part = (type) => parts.find((entry) => entry.type === type)?.value

    return { date: `${part('year')}-${part('month')}-${part('day')}`, time: `${part('hour')}:${part('minute')}` }
}

const toValue = ({ date, time }) => (date ? `${date}T${time || '00:00'}` : null)

function detail(upload, timeZone) {
    const when = (iso) => formatWhen(iso, timeZone)

    switch (upload.status) {
        case 'open':
            return upload.closes_at
                ? `Closes ${when(upload.closes_at)} · ${formatDistanceToNowStrict(new Date(upload.closes_at), { addSuffix: true })}`
                : 'Open with no closing time'
        case 'scheduled':
            return upload.closes_at
                ? `Opens ${when(upload.opens_at)} · closes ${when(upload.closes_at)}`
                : `Opens ${when(upload.opens_at)}`
        case 'closed':
            return `Closed ${when(upload.closes_at)}. Teachers can still submit; those show as late.`
        default:
            return 'Teachers can’t upload grades yet.'
    }
}

function errorText(error) {
    const data = error?.response?.data
    return Object.values(data?.errors ?? {}).flat()[0] || data?.message || 'Couldn’t save. Please try again.'
}

function UploadDialog({ open, onOpenChange, schoolYearId, period, upload, timeZone }) {
    const client = useQueryClient()
    const formId = useId()
    const label = LABEL[period]
    const [opens, setOpens] = useState(() => toParts(upload.opens_at, timeZone))
    const [closes, setCloses] = useState(() => toParts(upload.closes_at, timeZone))

    const save = useMutation({
        mutationFn: async (body) => (await axios.patch(`/grade-upload/${schoolYearId}`, { period, ...body })).data,
        onSuccess: (data, body) => {
            client.setQueryData(['grade-upload', schoolYearId], data)
            toast.success(
                body.action === 'open_now' ? `${label} grade upload is open`
                    : body.action === 'close_now' ? `${label} grade upload is closed`
                        : `${label} grade upload dates saved`
            )
            onOpenChange(false)
        },
    })

    // Start from the saved times each time it opens.
    useEffect(() => {
        if (!open) return
        setOpens(toParts(upload.opens_at, timeZone))
        setCloses(toParts(upload.closes_at, timeZone))
        save.reset()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open])

    const busy = save.isPending
    const saved = { opens: toParts(upload.opens_at, timeZone), closes: toParts(upload.closes_at, timeZone) }
    const changed = toValue(opens) !== toValue(saved.opens) || toValue(closes) !== toValue(saved.closes)
    const error = save.isError ? errorText(save.error) : ''
    const fieldErrors = save.error?.response?.data?.errors ?? {}

    return (
        <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
            <DialogContent className="w-[calc(100%-2rem)] max-w-md rounded-xl">
                <DialogHeader className="text-left">
                    <DialogTitle>{label} grade upload</DialogTitle>
                    <DialogDescription>{detail(upload, timeZone)} Times are in Philippine time.</DialogDescription>
                </DialogHeader>

                <form
                    id={formId}
                    className="space-y-4"
                    onSubmit={(event) => {
                        event.preventDefault()
                        save.mutate({ opens_at: toValue(opens), closes_at: toValue(closes) })
                    }}
                >
                    <DateTimeField label="Opens" value={opens} onChange={setOpens} defaultTime="08:00" disabled={busy}
                        invalid={Boolean(fieldErrors.opens_at)} />
                    <DateTimeField label="Closes" optional value={closes} onChange={setCloses} defaultTime="23:59" disabled={busy}
                        invalid={Boolean(fieldErrors.closes_at)} hint="Leave empty to keep it open until you close it." />
                    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
                </form>

                <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between sm:space-x-0">
                    <Button type="button" variant="outline" disabled={busy}
                        onClick={() => save.mutate({ action: upload.status === 'open' ? 'close_now' : 'open_now' })}>
                        {upload.status === 'open' ? 'Close now' : 'Open now'}
                    </Button>
                    <div className="flex flex-col-reverse gap-2 sm:flex-row">
                        <Button type="button" variant="ghost" disabled={busy} onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" form={formId} disabled={busy || !changed} className="gap-2">
                            {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                            Save
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

/**
 * One line for the selected period's grade upload: its status and times,
 * and "Set dates" to change them. Teachers can enter and submit grades
 * while it's open; there are no switches.
 */
export default function GradeUploadPanel({ schoolYearId, period, query }) {
    const [editing, setEditing] = useState(false)
    const timeZone = query.data?.time_zone ?? 'Asia/Manila'
    const upload = query.data?.periods?.[period]

    return (
        <div className="flex min-h-14 flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border bg-card px-4 py-3">
            <span className="text-sm font-semibold">{LABEL[period]} grade upload</span>

            {query.isPending ? (
                <span className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                    Loading…
                </span>
            ) : query.isError ? (
                <>
                    <span role="alert" className="text-sm text-destructive">{errorText(query.error)}</span>
                    <Button type="button" size="sm" variant="outline" className="ml-auto" onClick={() => query.refetch()}>Try again</Button>
                </>
            ) : (
                <>
                    <Badge variant="outline" className={cn('font-medium', TONE[upload.status])}>{BADGE[upload.status]}</Badge>
                    <span className="min-w-0 text-sm text-muted-foreground">{detail(upload, timeZone)}</span>
                    <Button type="button" size="sm" variant="outline" className="ml-auto" onClick={() => setEditing(true)}>
                        Set dates
                    </Button>
                    <UploadDialog
                        open={editing}
                        onOpenChange={setEditing}
                        schoolYearId={schoolYearId}
                        period={period}
                        upload={upload}
                        timeZone={timeZone}
                    />
                </>
            )}
        </div>
    )
}
