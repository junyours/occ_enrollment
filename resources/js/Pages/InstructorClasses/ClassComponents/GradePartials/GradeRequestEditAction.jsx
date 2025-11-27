import { Button } from '@/components/ui/button';
import React from 'react';
import { Edit3, X, CheckCircle2, Clock } from 'lucide-react';

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
                className="h-8 px-3 gap-2 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 transition-colors"
                onClick={() => handleRequestEdit(type)}
            >
                <Edit3 className="w-3.5 h-3.5" />
                Request Edit
            </Button>
        );
    }

    if (isPending) {
        return (
            <Button
                disabled={isDisabled}
                variant="outline"
                size="sm"
                className="h-8 px-3 gap-2 border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100 hover:border-amber-400 transition-colors"
                onClick={() => handleCancelRequestEdit(type)}
            >
                <Clock className="w-3.5 h-3.5" />
                <span className="font-medium">Pending</span>
                <X className="w-3.5 h-3.5 ml-1" />
            </Button>
        );
    }

    if (isApproved) {
        return (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-md text-green-700 text-sm font-medium">
                <CheckCircle2 className="w-4 h-4" />
                Edit Request Approved
            </div>
        );
    }

    return null;
}