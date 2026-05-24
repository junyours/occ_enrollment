import { cn } from '@/Lib/Utils';
import { computeFinalGrade } from '@/Pages/Grades/GradeUtility';
import React from 'react';
import { Badge } from './ui/badge';

export default function GradeRemarkBadge({ midterm, final, className, ...props }) {

    if(final == '5.0') console.log(midterm)

    // both midterm and final had no data
    if ((midterm === '' || midterm === null) && (final === '' || final === null)) {
        return null;
    }

    const finalGrade = computeFinalGrade(midterm, final);

    // 0 = dropped
    const isDropped = parseFloat(midterm) === 0 || parseFloat(final) === 0;

    const isPassed = !isDropped && midterm && final && finalGrade <= 3; 
    const isFailed = !isDropped && midterm && final && finalGrade > 3;

    let style = '';
    let text = '';

    if (isDropped) {
        style = 'bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200';
        text = 'DROPPED';
    } else if (isPassed) {
        style = 'bg-green-100 text-green-700 hover:bg-green-100 border-green-200';
        text = 'PASSED';
    } else if (isFailed) {
        style = 'bg-red-100 text-red-600 hover:bg-red-100 border-red-200';
        text = 'FAILED';
    } else {
        return null;
    }

    return (
        <Badge
            className={cn(
                style,
                "font-semibold print:bg-transparent print:border-0 print:shadow-none",
                className,
            )}
            {...props}
        >
            {text}
        </Badge>
    );
}