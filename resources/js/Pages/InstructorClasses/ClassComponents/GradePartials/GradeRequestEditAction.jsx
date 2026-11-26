import { Button } from '@/Components/ui/button';
import React from 'react';
import { Edit3, CheckCircle2, Clock } from 'lucide-react';
import { Link } from '@inertiajs/react';

// Asking to correct deployed grades: the request button, the pending
// request (with a separate Cancel, which asks first), or the approved one,
// which leads to where the changes are made.
export default function GradeRequestEditAction({
    gradeSubmissionStatus,
    isDisabled,
    handleRequestEdit,
    type,
    requestStatus,
    handleCancelRequestEdit
}) {
    const canRequestEdit = gradeSubmissionStatus === 'deployed' &&
        (requestStatus?.status === 'submitted' ||
            requestStatus?.status === 'rejected' ||
            !requestStatus?.status);

    const isPending = requestStatus?.status === 'pending';
    const isApproved = requestStatus?.status === 'approved';

    if (canRequestEdit) {
        return (
            <Button
                disabled={isDisabled}
                variant="outline"
                size="sm"
                className="h-8 gap-2 px-3"
                onClick={() => handleRequestEdit(type)}
            >
                <Edit3 aria-hidden="true" className="size-3.5" />
                Request edit
            </Button>
        );
    }

    if (isPending) {
        return (
            <div className="flex items-center gap-1">
                <span className="inline-flex h-8 items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-2.5 text-xs font-medium text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                    <Clock aria-hidden="true" className="size-3.5" />
                    Edit request pending
                </span>
                <Button
                    disabled={isDisabled}
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs"
                    onClick={() => handleCancelRequestEdit(type)}
                >
                    Cancel request
                </Button>
            </div>
        );
    }

    if (isApproved) {
        return (
            <Button
                asChild
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 border-emerald-600/30 bg-emerald-500/10 px-2.5 text-xs text-emerald-800 hover:bg-emerald-500/15 hover:text-emerald-900 dark:text-emerald-300 dark:hover:text-emerald-200"
            >
                <Link href={route('requests')}>
                    <CheckCircle2 aria-hidden="true" className="size-3.5" />
                    Edit approved: make changes
                </Link>
            </Button>
        );
    }

    return null;
}
