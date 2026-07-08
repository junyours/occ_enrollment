import { Badge } from '@/Components/ui/badge';
import { cn } from '@/Lib/Utils';

/**
 * Derives enrollment status from raw grade fields.
 * Mirrors the inline logic in EnrollmentRecord.jsx so desktop and mobile
 * views never disagree on what counts as passed/failed/dropped.
 */
export function getSubjectStatus(classInfo, finalGrade) {
    if (!classInfo.evaluated) return 'evaluation_required';

    const isDropped =
        classInfo.midterm_grade == 0.0 ||
        classInfo.final_grade == 0.0 ||
        classInfo.grade == 0.0;

    if (isDropped) return 'dropped';

    const hasMidterm = classInfo.midterm_grade || classInfo.grade;
    const hasFinal = classInfo.final_grade || classInfo.grade;

    if (!hasMidterm || !hasFinal) return 'pending';

    const isPassed = (finalGrade <= 3 || classInfo.grade <= 3);
    return isPassed ? 'passed' : 'failed';
}

const STATUS_CONFIG = {
    passed: {
        label: 'Passed',
        className: 'bg-green-100 text-green-800 hover:bg-green-100 border-green-200',
    },
    failed: {
        label: 'Failed',
        className: 'bg-red-100 text-red-800 hover:bg-red-100 border-red-200',
    },
    dropped: {
        label: 'Dropped',
        className: 'bg-orange-100 text-orange-800 hover:bg-orange-100 border-orange-200',
    },
    pending: {
        label: 'Pending',
        className: 'bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200',
    },
    evaluation_required: {
        label: 'Evaluation required',
        className: 'bg-slate-100 text-slate-600 hover:bg-slate-100 border-slate-200',
    },
};

export function StatusBadge({ status, className }) {
    const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
    return (
        <Badge className={cn(config.className, 'font-semibold whitespace-nowrap', className)}>
            {config.label}
        </Badge>
    );
}

export { STATUS_CONFIG };