import React from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/Components/ui/accordion';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Link } from '@inertiajs/react';
import { ArrowRight } from 'lucide-react';
import { formatFullName } from '@/Lib/Utils';
import { computeFinalGrade } from '@/Pages/Grades/GradeUtility';

// --- Shared Helpers ---
export const getInstructorName = (classInfo) => {
    if (classInfo.first_name) return formatFullName(classInfo);
    if (classInfo.nstp_faculty_first_name) {
        return formatFullName({
            first_name: classInfo.nstp_faculty_first_name,
            last_name: classInfo.nstp_faculty_last_name,
            middle_name: classInfo.nstp_faculty_middle_name
        });
    }
    return '-';
};

export const getSubjectStatus = (classInfo) => {
    const finalGrade = classInfo.grade ? classInfo.grade : computeFinalGrade(classInfo.midterm_grade, classInfo.final_grade);
    const isDropped = (classInfo.midterm_grade == 0.0 || classInfo.final_grade == 0.0) || classInfo.grade == 0.0;
    const isPassed = !isDropped && (classInfo.midterm_grade || classInfo.grade) && (classInfo.final_grade || classInfo.grade) && (finalGrade <= 3 || classInfo.grade <= 3);
    const isFailed = !isDropped && classInfo.midterm_grade && classInfo.final_grade && finalGrade > 3;

    let status = 'PENDING';
    if (!classInfo.evaluated) status = 'EVALUATION_REQUIRED';
    else if (isDropped) status = 'DROPPED';
    else if (isPassed) status = 'PASSED';
    else if (isFailed) status = 'FAILED';

    return { finalGrade, status, isDropped, isPassed, isFailed, isEvaluated: classInfo.evaluated };
};

export const StatusBadge = ({ status }) => {
    switch (status) {
        case 'PASSED':
            return <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200 font-semibold uppercase text-[10px]">Passed</Badge>;
        case 'FAILED':
            return <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border-red-200 font-semibold uppercase text-[10px]">Failed</Badge>;
        case 'DROPPED':
            return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100 border-orange-200 font-semibold uppercase text-[10px]">Dropped</Badge>;
        case 'EVALUATION_REQUIRED':
            return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200 font-semibold uppercase text-[10px]">Eval Req</Badge>;
        default:
            return <Badge className="bg-slate-100 text-slate-800 hover:bg-slate-100 border-slate-200 font-semibold uppercase text-[10px]">Pending</Badge>;
    }
};

export const formatGradeDisplay = (grade) => {
    if (grade === 0.0) return <span className="text-red-500 font-medium">DROPPED</span>;
    return grade ? grade.toFixed(1) : '-';
};

const getRecordSummary = (subjects) => {
    let passed = 0, failed = 0, pending = 0, dropped = 0, evalReq = 0;
    subjects.forEach(sub => {
        const { status } = getSubjectStatus(sub);
        if (status === 'PASSED') passed++;
        if (status === 'FAILED') failed++;
        if (status === 'DROPPED') dropped++;
        if (status === 'EVALUATION_REQUIRED') evalReq++;
        if (status === 'PENDING') pending++;
    });
    return { passed, failed, pending, dropped, evalReq };
};

export default function EnrollmentRecordMobileView({ records }) {
    return (
        <div className="w-full space-y-4">
            <Accordion type="multiple" className="w-full space-y-4">
                {records.map(record => {
                    const summary = getRecordSummary(record.subjects);
                    const summaryText = [
                        summary.passed > 0 && `${summary.passed} Passed`,
                        summary.failed > 0 && `${summary.failed} Failed`,
                        summary.dropped > 0 && `${summary.dropped} Dropped`,
                        summary.pending > 0 && `${summary.pending} Pending`,
                        summary.evalReq > 0 && `${summary.evalReq} Eval Req`,
                    ].filter(Boolean).join(' • ');

                    return (
                        <AccordionItem value={`year-${record.id}`} key={record.id} className="bg-card shadow-sm rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden px-4">
                            <AccordionTrigger className="hover:no-underline py-4">
                                <div className="flex flex-col items-start text-left gap-1.5 w-full pr-2">
                                    <div className="font-bold text-sm text-primary leading-tight">
                                        {record.start_year}–{record.end_year} • {record.semester_name} Semester
                                    </div>
                                    <div className="text-xs text-muted-foreground font-medium flex flex-wrap gap-1">
                                        <span>{record.subjects.length} Subjects</span>
                                        {summaryText && <span>| {summaryText}</span>}
                                    </div>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="pt-0 pb-4">
                                <Accordion type="multiple" className="w-full space-y-3 mt-2">
                                    {record.subjects.map(subject => {
                                        const { finalGrade, status, isEvaluated } = getSubjectStatus(subject);

                                        return (
                                            <AccordionItem value={`sub-${subject.id}`} key={subject.id} className="border rounded-lg px-3 bg-slate-50/60 dark:bg-slate-900/40">
                                                <AccordionTrigger className="hover:no-underline py-3">
                                                    <div className="flex justify-between items-center w-full pr-2 gap-3">
                                                        <div className="flex flex-col items-start flex-1 min-w-0">
                                                            <span className="font-bold text-sm truncate w-full text-left">{subject.subject_code}</span>
                                                            <span className="text-[11px] text-muted-foreground truncate w-full text-left">{subject.descriptive_title}</span>
                                                        </div>
                                                        <div className="flex flex-col items-end flex-shrink-0 gap-1.5">
                                                            <StatusBadge status={status} />
                                                            {isEvaluated && <span className="text-[11px] font-bold">Grade: {finalGrade || '-'}</span>}
                                                        </div>
                                                    </div>
                                                </AccordionTrigger>
                                                <AccordionContent>
                                                    {isEvaluated ? (
                                                        <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm mt-2 p-3 bg-white dark:bg-slate-950 rounded-md border shadow-sm">
                                                            <div className="col-span-2">
                                                                <span className="text-muted-foreground text-[10px] uppercase tracking-wider font-semibold block mb-0.5">Instructor</span>
                                                                <span className="font-medium text-sm">{getInstructorName(subject)}</span>
                                                            </div>
                                                            <div>
                                                                <span className="text-muted-foreground text-[10px] uppercase tracking-wider font-semibold block mb-0.5">Midterm</span>
                                                                <span className="font-medium">{formatGradeDisplay(subject.midterm_grade)}</span>
                                                            </div>
                                                            <div>
                                                                <span className="text-muted-foreground text-[10px] uppercase tracking-wider font-semibold block mb-0.5">Final</span>
                                                                <span className="font-medium">{formatGradeDisplay(subject.final_grade)}</span>
                                                            </div>
                                                            <div>
                                                                <span className="text-muted-foreground text-[10px] uppercase tracking-wider font-semibold block mb-0.5">Computed Grade</span>
                                                                <span className="font-bold">{finalGrade || '-'}</span>
                                                            </div>
                                                            <div>
                                                                <span className="text-muted-foreground text-[10px] uppercase tracking-wider font-semibold block mb-0.5">Remarks</span>
                                                                <StatusBadge status={status} />
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex justify-center p-4 bg-white dark:bg-slate-950 rounded-md border mt-2">
                                                            <Link href={route('student.evaluation')}>
                                                                <Button variant='link' className='p-0 h-min flex items-center gap-1'>
                                                                    <span className='font-medium text-blue-600'>Evaluation Required</span>
                                                                    <ArrowRight className="w-4 h-4 text-blue-600" />
                                                                </Button>
                                                            </Link>
                                                        </div>
                                                    )}
                                                </AccordionContent>
                                            </AccordionItem>
                                        );
                                    })}
                                </Accordion>
                            </AccordionContent>
                        </AccordionItem>
                    );
                })}
            </Accordion>
        </div>
    );
}