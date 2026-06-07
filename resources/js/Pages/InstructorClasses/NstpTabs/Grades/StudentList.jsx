import { Card, CardContent, CardDescription, CardHeader } from '@/Components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { computeFinalGrade } from '@/Pages/Grades/GradeUtility';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import GradeInput from '../../ClassComponents/GradeInput';
import { cn } from '@/Lib/Utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/Components/ui/tooltip';
import { formatName } from '@/Lib/InfoUtils';
import GradeRemarkBadge from '@/Components/GradeRemarkBadge';

const CardTableHead = ({ children }) => (
    <Card>
        <CardHeader>
            <CardDescription className='text-red-500 no-print'>
                Note: If the student IS DROPPED, enter 0.0. Do not leave it blank.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <Table>
                <TableHeader>
                    <TableRow className='print:p-0 print:h-min'>
                        <TableHead className="w-8 text-center print:p-0 print:h-min">#</TableHead>
                        <TableHead className='print:p-0 print:h-min'>ID NUMBER</TableHead>
                        <TableHead className='print:p-0 print:h-min'>STUDENT NAME</TableHead>
                        <TableHead className="text-center print:p-0 print:h-min">MIDTERM</TableHead>
                        <TableHead className="text-center print:p-0 print:h-min">FINAL</TableHead>
                        <TableHead className="text-center print:p-0 print:h-min">FINAL RATING</TableHead>
                        <TableHead className="text-center print:p-0 print:h-min">REMARKS</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {children}
                </TableBody>
            </Table>
        </CardContent>
    </Card>
)

const Skeleton = () => (
    <CardTableHead>
        {Array.from({ length: 40 }).map((_, index) => (
            <TableRow key={index}>
                {Array.from({ length: 7 }).map((_, colIndex) => (
                    <TableCell key={cn('cell', colIndex)}>
                        <div className="h-4 bg-muted animate-pulse rounded"></div>
                    </TableCell>
                ))}
            </TableRow>
        ))}
    </CardTableHead>
)

const TABLE_CELL_CLASS = "print:p-0";
const INPUT_BASE_CLASS = "w-16 text-center h-6 py-0 print:w-10 no-print rounded-none border-t-0 border-x-0 border-b border-gray-400 shadow-none focus:border-b-2 focus:outline-none focus-visible:ring-0 duration-200 ease-in-out";

// 2. Create a reusable component for the Grade logic
const GradeCellContent = ({ status, grade, allowUpload, isMissing, onGradeChange, index, field }) => {
    const isLocked = ['submitted', 'deployed', 'verified'].includes(status);
    const inputClassName = cn(INPUT_BASE_CLASS, isMissing ? 'border-red-500 bg-red-500/20' : '');

    // If locked, just show the grade text
    if (isLocked) {
        return <div>{grade}</div>;
    }

    // The shared input component
    const InputComponent = (
        <GradeInput
            value={grade}
            className={`${inputClassName}`}
            disabled={!allowUpload}
            min={1}
            max={5}
            index={index}
            field={field}
            onValueChange={!allowUpload ? undefined : onGradeChange}
        />
    );

    if (!allowUpload) {
        return (
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className="inline-block">{InputComponent}</div>
                </TooltipTrigger>
                <TooltipContent>Not allowed to upload grades</TooltipContent>
            </Tooltip>
        )
    }

    return (
        <>
            <div className="inline-block print:hidden">{InputComponent}</div>
            {/* Print-only fallback */}
            <div className="hidden print:block">{grade}</div>
        </>
    );
};

export default function StudentList({ id, allowMidtermUpload, allowFinalUpload, localGrades, setLocalGrades, missingFields, setMissingFields, gradeSubmissionLoading, gradeSubmissionStatus }) {
    const getStudentNstpGrades = async () => {
        try {
            const response = await axios.post(route('nstp.students-grades', { id }));
            return response.data;
        } catch (error) {
            toast.error('Something went wrong! Please try refreshing your browser');
            throw error;
        }
    }

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['nstp.students-grades', id],
        queryFn: getStudentNstpGrades,
        enabled: !!id,
    });

    useEffect(() => {
        if (data) {
            const initialGrades = {};

            data.forEach(student => {
                const roundedMidterm =
                    student.midterm_grade !== null && student.midterm_grade !== ''
                        ? (Math.round(student.midterm_grade * 10) / 10).toFixed(1)
                        : '';

                const roundedFinal =
                    student.final_grade !== null && student.final_grade !== ''
                        ? (Math.round(student.final_grade * 10) / 10).toFixed(1)
                        : '';

                initialGrades[student.id] = {
                    ...student,
                    midterm_grade: roundedMidterm,
                    final_grade: roundedFinal
                };
            });

            setLocalGrades(initialGrades);
        }
    }, [data]);

    const timeoutRefs = useRef({});

    const updateGrade = (studentId, field, value) => {
        if (value) {
            setMissingFields(prev => {
                if (!prev[studentId]) return prev;

                const missingKey = field.includes('midterm') ? 'midterm' : 'final';

                // 3. Set that specific missing flag to false
                return {
                    ...prev,
                    [studentId]: {
                        ...prev[studentId],
                        [missingKey]: false
                    }
                };
            });
        } else if (value == '') {
            setMissingFields(prev => ({
                ...prev,
                [studentId]: {
                    ...prev[studentId],
                    [field.includes('midterm') ? 'midterm' : 'final']: true
                }
            }));
        }

        const previousValue = localGrades[studentId]?.[field];

        setLocalGrades(prev => ({
            ...prev,
            [studentId]: {
                ...prev[studentId],
                [field]: value,
            }
        }));

        const key = `${studentId}-${field}`;

        clearTimeout(timeoutRefs.current[key]);


        timeoutRefs.current[key] = setTimeout(async () => {
            try {
                await axios.patch(
                    route('nstp.student-update-grade', {
                        field,
                        id: studentId
                    }),
                    {
                        [field]: value === '' ? null : Number(value),
                    }
                );
            } catch (error) {

                setLocalGrades(prev => ({
                    ...prev,
                    [studentId]: {
                        ...prev[studentId],
                        [field]: previousValue,
                    }
                }));

                toast.error(
                    error.response?.data?.message ||
                    'Failed to update grade'
                );
            }
        }, 1400);
    };

    const displayGrades = useMemo(() => {
        if (!data) return [];

        return data.map((student) => {
            const local = localGrades[student.id];
            return {
                ...student,
                midterm_grade: local?.midterm_grade ?? student.midterm_grade,
                final_grade: local?.final_grade ?? student.final_grade,
            };
        });
    }, [data, localGrades]);

    const [activeRow, setActiveRow] = useState(null);

    if (isError) return <>Error loading grades.</>;
    if (isLoading || !data || gradeSubmissionLoading) return <Skeleton />;

    return (
        <div>
            <CardTableHead>
                {displayGrades.map((student, index) => {
                    const finalGrade = computeFinalGrade(student.midterm_grade, student.final_grade);

                    return (
                        <TableRow
                            key={student.user_id_no}
                            className={cn(
                                'p-0 print:p-0',
                                activeRow === student.user_id_no && 'bg-muted/50'
                            )}
                            onFocus={() => setActiveRow(student.user_id_no)}
                            onBlur={(e) => {
                                if (!e.currentTarget.contains(e.relatedTarget)) {
                                    setActiveRow(null);
                                }
                            }}
                        >
                            <TableCell className={cn('text-center', TABLE_CELL_CLASS)}>{index + 1}.</TableCell>
                            <TableCell className={TABLE_CELL_CLASS}>{student.user_id_no}</TableCell>
                            <TableCell className={TABLE_CELL_CLASS}>{formatName(student, { format: 'LFM' })}</TableCell>

                            {/* Midterm Column */}
                            <TableCell className={cn('text-center', TABLE_CELL_CLASS)}>
                                <GradeCellContent
                                    status={gradeSubmissionStatus.midterm_status}
                                    grade={student.midterm_grade}
                                    allowUpload={allowMidtermUpload}
                                    isMissing={missingFields[student.id]?.midterm}
                                    index={index}
                                    field="midterm_grade"
                                    onGradeChange={(value) => updateGrade(student.id, 'midterm_grade', value)}
                                />
                            </TableCell>

                            {/* Final Column */}
                            <TableCell className={cn('text-center', TABLE_CELL_CLASS)}>
                                <GradeCellContent
                                    status={gradeSubmissionStatus.final_status}
                                    grade={student.final_grade}
                                    allowUpload={allowFinalUpload}
                                    isMissing={missingFields[student.id]?.final}
                                    index={index}
                                    field="final_grade"
                                    onGradeChange={(value) => updateGrade(student.id, 'final_grade', value)}
                                />
                            </TableCell>

                            <TableCell className={cn('text-center', TABLE_CELL_CLASS)}>
                                {finalGrade || '-'}
                            </TableCell>

                            <TableCell className={cn('text-center', TABLE_CELL_CLASS)}>
                                <GradeRemarkBadge midterm={student.midterm_grade} final={student.final_grade} />
                            </TableCell>
                        </TableRow>
                    );
                })}
            </CardTableHead>
        </div>
    )
}
