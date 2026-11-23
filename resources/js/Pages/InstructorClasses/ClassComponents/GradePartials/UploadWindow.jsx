import React from 'react'
import { cn } from '@/Lib/Utils'

// "Fri, Dec 5, 11:59 PM", in school time.
export function formatUploadTime(iso) {
    return new Intl.DateTimeFormat('en-PH', {
        timeZone: 'Asia/Manila', weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    }).format(new Date(iso))
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
export default function UploadWindow({ upload, status, className }) {
    if (!upload) return null

    const closes = upload.closes_at && formatUploadTime(upload.closes_at)
    const text = status === 'rejected' && upload.status !== 'open'
        ? 'Sent back for changes. You can fix and resubmit.'
        : {
            open: closes ? `Open until ${closes}` : 'Open',
            scheduled: upload.opens_at && `Opens ${formatUploadTime(upload.opens_at)}`,
            not_set: 'Not open yet',
            closed: status === 'draft'
                ? `Closed ${closes}. Submitting now is marked late.`
                : `Closed ${closes}`,
        }[upload.status]

    return text ? <p className={cn('text-xs text-muted-foreground', className)}>{text}</p> : null
}
