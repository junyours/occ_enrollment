import React from 'react'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/Components/ui/alert-dialog'
import { AlertCircle, CheckCircle, ChevronDown, ChevronUp, FileText, Rocket, Send, XCircle } from 'lucide-react'
import { cn } from '@/Lib/Utils'
import InstructorGradeSubmitionButton from './InstructorGradeSubmitionButton'
import GradeRequestEditAction from './GradeRequestEditAction'
import { canSubmitOrUnsubmit, formatUploadTime, uploadWindowText } from './UploadWindow'
import './grades.css'

// The midterm and final submission bar shared by the Grades tab and the NSTP
// grades tab: each period's status, upload window and main action, and the
// confirmation before submitting, unsubmitting or cancelling an edit request.

// Order of the submission pipeline. "rejected" is a detour that sits at the
// "submitted" step, so it reuses that position with a red fill.
const STEPS = ['draft', 'submitted', 'verified', 'deployed']

export const statusMap = {
    draft: {
        label: 'Draft',
        text: 'text-gray-500 dark:text-gray-400',
        bar: 'bg-gray-400',
        icon: FileText,
        step: 0,
    },
    submitted: {
        label: 'Submitted',
        text: 'text-blue-600 dark:text-blue-400',
        bar: 'bg-blue-500',
        icon: Send,
        step: 1,
    },
    verified: {
        label: 'Verified',
        text: 'text-green-600 dark:text-green-400',
        bar: 'bg-green-600',
        icon: CheckCircle,
        step: 2,
    },
    rejected: {
        label: 'Rejected',
        text: 'text-red-600 dark:text-red-400',
        bar: 'bg-red-500',
        icon: XCircle,
        step: 1,
    },
    deployed: {
        label: 'Deployed',
        text: 'text-indigo-600 dark:text-indigo-400',
        bar: 'bg-indigo-600',
        icon: Rocket,
        step: 3,
    },
}

// The period's status and when its upload opens or closes, over a
// four-step track (draft, submitted, verified, deployed).
function StatusTrack({ status, note }) {
    const config = statusMap[status]
    const Icon = config?.icon

    return (
        <div className="min-w-0 flex-1">
            <p className="mb-1.5 line-clamp-2 text-xs">
                <span className={`inline-flex items-center gap-1.5 align-middle font-semibold ${config?.text ?? 'text-muted-foreground'}`}>
                    {Icon && <Icon size={14} aria-hidden="true" />}
                    {config?.label ?? '—'}
                </span>
                {note && <span className="text-muted-foreground"> · {note}</span>}
            </p>

            <div className="flex gap-1" aria-hidden="true">
                {STEPS.map((step, index) => (
                    <span
                        key={step}
                        className={`h-1 flex-1 rounded-full transition-colors ${config && index <= config.step ? config.bar : 'bg-muted'
                            }`}
                    />
                ))}
            </div>
        </div>
    )
}

/**
 * One period's card. `data` holds {period}_status and the times; the edit
 * request props are optional (the NSTP tab has none).
 */
export function SubmissionPanel({
    type,
    title,
    data,
    canUpload,
    upload,
    submitting,
    onSubmit,
    onCancel,
    onRequestEdit,
    onCancelRequestEdit,
    requestStatus,
    reasonOpen,
    onToggleReason,
}) {
    const status = data[`${type}_status`]
    const rejectionMessage = data[`${type}_rejection_message`]
    const showReason = status == 'rejected' && rejectionMessage
    // Submitting needs upload to have opened; unsubmitting needs it open.
    const allowed = canSubmitOrUnsubmit(upload, status, canUpload)

    return (
        <div className="rounded-xl border bg-card px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">{title}</h3>

                <div className="flex items-center gap-3">
                    {showReason && (
                        <div className="relative">
                            <button
                                type="button"
                                onClick={onToggleReason}
                                aria-expanded={reasonOpen}
                                className="flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                            >
                                <AlertCircle className="h-3 w-3" />
                                View reason
                                {reasonOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
                            </button>

                            {reasonOpen && (
                                <div className="absolute bottom-full right-0 z-50 mb-2 w-64 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-900 shadow-lg dark:border-red-900 dark:bg-red-950 dark:text-red-100">
                                    {rejectionMessage}
                                </div>
                            )}
                        </div>
                    )}

                    {onRequestEdit && (
                        <GradeRequestEditAction
                            gradeSubmissionStatus={status}
                            isDisabled={submitting === type}
                            handleRequestEdit={onRequestEdit}
                            type={type}
                            requestStatus={requestStatus}
                            handleCancelRequestEdit={onCancelRequestEdit}
                        />
                    )}
                </div>
            </div>

            <div className="mt-1.5 flex items-center gap-3">
                <StatusTrack status={status} note={uploadWindowText(upload, status)} />

                <InstructorGradeSubmitionButton
                    handleSubmit={onSubmit}
                    disabledButton={!allowed || submitting === type}
                    handleCancel={onCancel}
                    type={type}
                    status={{
                        deployed_at: data[`${type}_deployed_at`],
                        rejection_message: rejectionMessage,
                        status,
                        submitted_at: data[`${type}_submitted_at`],
                        verified_at: data[`${type}_verified_at`],
                    }}
                />
            </div>
        </div>
    )
}

/**
 * The bar holding both panels: part of the page, so never wider than it. On
 * wider screens it sticks to the bottom of the window while the sheet scrolls
 * (an ancestor needs the grades-panel class; see grades.css); on phones it
 * follows the sheet.
 */
export function SubmissionBar({ children }) {
    return (
        <div className="no-print z-30 pb-3 pt-2 print:hidden md:sticky md:bottom-0">
            <div className="grid gap-2 rounded-2xl border bg-background/90 p-2 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/75 md:grid-cols-2">
                {children}
            </div>
        </div>
    )
}

/**
 * What to ask before a grade action. confirm: { action: 'submit' | 'unsubmit'
 * | 'cancel-request', type }; grades: rows with midterm_grade/final_grade;
 * reviewer: who checks submitted grades ("program head", "NSTP director").
 */
export function gradeConfirmText({ confirm, grades, upload, status, reviewer }) {
    if (!confirm) return null

    const { action, type } = confirm
    const name = type === 'final' ? 'final' : 'midterm'
    const closes = upload?.closes_at && formatUploadTime(upload.closes_at)

    if (action === 'submit') {
        const field = `${type}_grade`
        const dropped = grades.filter((student) => student[field] !== '' && student[field] != null && Number(student[field]) === 0).length
        const resubmit = status === 'rejected'

        return {
            title: `${resubmit ? 'Resubmit' : 'Submit'} ${name} grades?`,
            body: [
                `${grades.length} ${grades.length === 1 ? 'student' : 'students'}${dropped ? `, ${dropped} marked dropped (0.0)` : ''}. The ${reviewer} checks them next.`,
                upload?.status === 'open'
                    ? `You can unsubmit${closes ? ` until ${closes}` : ' while upload is open'} if something needs fixing.`
                    : upload?.late ? 'Upload has closed, so these are marked late.' : null,
            ],
            confirm: resubmit ? 'Resubmit' : 'Submit',
        }
    }

    if (action === 'unsubmit') {
        return {
            title: `Unsubmit ${name} grades?`,
            body: [
                'They go back to a draft you can change.',
                closes ? `Submit them again before ${closes}, or they’ll be marked late.` : 'Submit them again when you’re done.',
            ],
            confirm: 'Unsubmit',
            destructive: true,
        }
    }

    return {
        title: 'Cancel your edit request?',
        body: [`The ${reviewer} won’t review your ${name} grade correction. You can send a new request later.`],
        confirm: 'Cancel request',
        keep: 'Keep request',
        destructive: true,
    }
}

// "Submit midterm grades?" and the like, before anything is sent.
export function ConfirmGradeAction({ text, onClose, onConfirm }) {
    return (
        <AlertDialog open={Boolean(text)} onOpenChange={(open) => { if (!open) onClose() }}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{text?.title}</AlertDialogTitle>
                    <AlertDialogDescription asChild>
                        <div className="space-y-2">
                            {text?.body.filter(Boolean).map((line) => <p key={line}>{line}</p>)}
                        </div>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>{text?.keep ?? 'Go back'}</AlertDialogCancel>
                    <AlertDialogAction
                        className={cn(text?.destructive && 'bg-destructive text-destructive-foreground hover:bg-destructive/90')}
                        onClick={onConfirm}
                    >
                        {text?.confirm}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
