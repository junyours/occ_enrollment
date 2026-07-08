import React, { useMemo } from 'react';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/Components/ui/accordion';
import { ArrowRight, GraduationCap } from 'lucide-react';
import { Link } from '@inertiajs/react';
import { formatFullName } from '@/Lib/Utils';
import { computeFinalGrade } from '@/Pages/Grades/GradeUtility';
import { StatusBadge, getSubjectStatus } from './StatusBadge';

function getInstructorName(classInfo) {
    if (classInfo.first_name) return formatFullName(classInfo);
    if (classInfo.nstp_faculty_first_name) {
        return formatFullName({
            first_name: classInfo.nstp_faculty_first_name,
            last_name: classInfo.nstp_faculty_last_name,
            middle_name: classInfo.nstp_faculty_middle_name,
        });
    }
    return '—';
}

function formatGradeValue(value) {
    if (value === 0.0) return 'Dropped';
    if (value === null || value === undefined) return '—';
    return value.toFixed(1);
}

function SemesterSummary({ counts }) {
    const parts = [];
    if (counts.passed) parts.push(`${counts.passed} passed`);
    if (counts.failed) parts.push(`${counts.failed} failed`);
    if (counts.dropped) parts.push(`${counts.dropped} dropped`);
    if (counts.pending || counts.evaluation_required) {
        const pendingTotal = counts.pending + counts.evaluation_required;
        parts.push(`${pendingTotal} pending`);
    }
    if (parts.length === 0) return null;

    return (
        <p className="text-xs text-muted-foreground">
            {parts.join(' • ')}
        </p>
    );
}

function SubjectDetailRow({ label, value }) {
    return (
        <div className="flex items-center justify-between py-1.5">
            <span className="text-xs text-muted-foreground">{label}</span>
            <span className="text-sm font-medium tabular-nums">{value}</span>
        </div>
    );
}

function SubjectAccordionItem({ classInfo }) {
    const finalGrade = classInfo.grade
        ? classInfo.grade
        : computeFinalGrade(classInfo.midterm_grade, classInfo.final_grade);
    const status = getSubjectStatus(classInfo, finalGrade);
    const instructor = getInstructorName(classInfo);

    if (!classInfo.evaluated) {
        return (
            <AccordionItem
                value={String(classInfo.id)}
                className="rounded-lg border bg-card px-3 last:border-b"
            >
                <div className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{classInfo.subject_code}</p>
                        <p className="truncate text-xs text-muted-foreground">
                            {classInfo.descriptive_title}
                        </p>
                    </div>
                    <Link href={route('student.evaluation')} className="shrink-0">
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                            Evaluate
                            <ArrowRight className="h-3 w-3" />
                        </span>
                    </Link>
                </div>
            </AccordionItem>
        );
    }

    return (
        <AccordionItem
            value={String(classInfo.id)}
            className="rounded-lg border bg-card px-3 last:border-b"
        >
            <AccordionTrigger className="py-3 hover:no-underline [&>svg]:shrink-0">
                <div className="flex min-w-0 flex-1 items-center justify-between gap-2 pr-2">
                    <div className="min-w-0 flex-1 text-left">
                        <p className="truncate text-sm font-semibold">{classInfo.subject_code}</p>
                        <p className="truncate text-xs text-muted-foreground">
                            {classInfo.descriptive_title}
                        </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                        <StatusBadge status={status} />
                        {finalGrade ? (
                            <span className="text-xs font-semibold tabular-nums text-muted-foreground">
                                Grade: {finalGrade}
                            </span>
                        ) : null}
                    </div>
                </div>
            </AccordionTrigger>
            <AccordionContent className="pb-3">
                <div className="rounded-md bg-muted/50 px-3 py-1 divide-y divide-border/60">
                    <SubjectDetailRow label="Instructor" value={instructor} />
                    <SubjectDetailRow
                        label="Midterm grade"
                        value={formatGradeValue(classInfo.midterm_grade)}
                    />
                    <SubjectDetailRow
                        label="Final grade"
                        value={formatGradeValue(classInfo.final_grade)}
                    />
                    <SubjectDetailRow label="Computed grade" value={finalGrade || '—'} />
                    <div className="flex items-center justify-between py-1.5">
                        <span className="text-xs text-muted-foreground">Remarks</span>
                        <StatusBadge status={status} />
                    </div>
                </div>
            </AccordionContent>
        </AccordionItem>
    );
}

function SemesterAccordionItem({ record }) {
    const counts = useMemo(() => {
        const tally = { passed: 0, failed: 0, dropped: 0, pending: 0, evaluation_required: 0 };
        record.subjects.forEach((classInfo) => {
            const finalGrade = classInfo.grade
                ? classInfo.grade
                : computeFinalGrade(classInfo.midterm_grade, classInfo.final_grade);
            const status = getSubjectStatus(classInfo, finalGrade);
            tally[status] = (tally[status] ?? 0) + 1;
        });
        return tally;
    }, [record.subjects]);

    return (
        <AccordionItem
            value={`record-${record.id}`}
            className="overflow-hidden rounded-xl border-l-4 border-l-primary bg-card shadow-sm"
        >
            <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <div className="flex-1 text-left">
                    <p className="text-sm font-semibold">
                        {record.start_year}–{record.end_year} • {record.semester_name} semester
                    </p>
                    <p className="text-xs text-muted-foreground">
                        {record.year_level_name} · {record.subjects.length} subject
                        {record.subjects.length === 1 ? '' : 's'}
                    </p>
                    <SemesterSummary counts={counts} />
                </div>
            </AccordionTrigger>
            <AccordionContent className="px-3 pb-3">
                <Accordion type="single" collapsible className="flex flex-col gap-2">
                    {record.subjects.map((classInfo) => (
                        <SubjectAccordionItem key={classInfo.id} classInfo={classInfo} />
                    ))}
                </Accordion>
            </AccordionContent>
        </AccordionItem>
    );
}

function MobileEnrollmentRecord({ records }) {
    return (
        <div className="flex flex-col gap-3 px-1">
            <div className="mb-1 flex items-center gap-2 px-1">
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Enrollment record
                </span>
            </div>
            <Accordion type="single" collapsible defaultValue={`record-${records[0]?.id}`} className="flex flex-col gap-3">
                {records.map((record) => (
                    <SemesterAccordionItem key={record.id} record={record} />
                ))}
            </Accordion>
        </div>
    );
}

export default MobileEnrollmentRecord;