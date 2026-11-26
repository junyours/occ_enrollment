import React from 'react'
import { cn } from '@/Lib/Utils'

// "Fri, Dec 5, 11:59 PM", in school time.
export function formatUploadTime(iso) {
    return new Intl.DateTimeFormat('en-PH', {
        timeZone: 'Asia/Manila', weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    }).format(new Date(iso))
}

// A database time ("2026-11-22 09:30:00", school time) or an ISO time, as
// "Sun, Nov 22, 9:30 AM". Empty when there's none.
export function formatStamp(value) {
    if (!value) return ''
    const iso = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(value) ? `${value.replace(' ', 'T')}+08:00` : value
    const date = new Date(iso)

    return Number.isNaN(date.getTime()) ? '' : formatUploadTime(date)
}

/**
 * Whether a period's Submit (or, once submitted, Unsubmit) button works now.
 * `upload` is that period's entry in schoolYear.grade_upload; without it,
 * `fallback` (the old allow_upload_* flag) decides.
 */
export function canSubmitOrUnsubmit(upload, status, fallback) {
    if (!upload) return Boolean(fallback)

    return status === 'submitted' ? upload.can_cancel : upload.can_submit
}

/** When this period's grades can be entered, from the registrar's dates. */
export function uploadWindowText(upload, status) {
    if (!upload) return null

    const closes = upload.closes_at && formatUploadTime(upload.closes_at)

    if (status === 'rejected' && upload.status !== 'open') {
        return 'Sent back for changes. You can fix and resubmit.'
    }

    return {
        open: closes ? `Open until ${closes}` : 'Open',
        scheduled: upload.opens_at && `Opens ${formatUploadTime(upload.opens_at)}`,
        not_set: 'Not open yet',
        closed: status === 'draft'
            ? `Closed ${closes}. Submitting now is marked late.`
            : `Closed ${closes}`,
    }[upload.status] || null
}

/**
 * Why a period's grade boxes are locked while still a draft, from the
 * registrar's dates: "Midterm grade entry closed Fri, Nov 20, 5:00 PM."
 */
export function lockedReason(period, upload) {
    const label = period === 'final' ? 'Final' : 'Midterm'

    switch (upload?.status) {
        case 'scheduled':
            return upload.opens_at
                ? `${label} grade entry opens ${formatUploadTime(upload.opens_at)}.`
                : `${label} grade entry hasn’t opened yet.`
        case 'closed':
            return upload.closes_at
                ? `${label} grade entry closed ${formatUploadTime(upload.closes_at)}.`
                : `${label} grade entry has closed.`
        case 'not_set':
            return `${label} grade entry hasn’t opened yet.`
        default:
            return `${label} grades can’t be changed right now.`
    }
}

export default function UploadWindow({ upload, status, className }) {
    const text = uploadWindowText(upload, status)

    return text ? <p className={cn('text-xs text-muted-foreground', className)}>{text}</p> : null
}
