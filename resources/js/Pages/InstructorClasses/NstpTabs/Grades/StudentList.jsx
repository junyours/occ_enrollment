import { Card, CardContent } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useEffect, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import { formatName } from '@/Lib/InfoUtils';
import GradesStudentList from '../../ClassComponents/GradePartials/GradesStudentList';
import { lockedReason } from '../../ClassComponents/GradePartials/UploadWindow';

// While the grades load.
const Skeleton = () => (
    <Card>
        <CardContent className="space-y-3 pt-6">
            {Array.from({ length: 12 }).map((_, index) => (
                <div key={index} className="h-6 animate-pulse rounded bg-muted" />
            ))}
        </CardContent>
    </Card>
)

// A saved grade as the boxes show it: one decimal, or blank.
const asGrade = (value) => (
    value === null || value === undefined || value === ''
        ? ''
        : typeof value === 'number' ? (Math.round(value * 10) / 10).toFixed(1) : value
)

export default function StudentList({ id, allowMidtermUpload, allowFinalUpload, gradeUpload, localGrades, setLocalGrades, missingFields, setMissingFields, gradeSubmissionLoading, gradeSubmissionStatus }) {
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

    if (isError) {
        return (
            <div className="flex flex-col items-center gap-3 py-16 text-center text-sm text-muted-foreground">
                Couldn’t load the grades for this section.
                <Button variant="outline" size="sm" onClick={() => refetch()}>Try again</Button>
            </div>
        );
    }
    if (isLoading || !data || gradeSubmissionLoading) return <Skeleton />;

    // The Grades tab's list: bigger boxes, Enter to go down a column, the
    // reason a box is locked, and a card per student on phones.
    const rows = displayGrades.map((student) => ({
        id_number: student.user_id_no,
        name: formatName(student, { format: 'LFM' }),
        midterm_grade: asGrade(student.midterm_grade),
        final_grade: asGrade(student.final_grade),
    }));

    return (
        <GradesStudentList
            grades={rows}
            status={gradeSubmissionStatus}
            missingFields={Object.fromEntries(displayGrades.map((student, index) => [index, missingFields[student.id]]))}
            handleGradeChange={(index, field, value) => updateGrade(displayGrades[index].id, field, value)}
            // updateGrade sets and clears the missing marks itself.
            setMissingFields={() => { }}
            allowMidtermUpload={allowMidtermUpload}
            allowFinalUpload={allowFinalUpload}
            midtermLock={lockedReason('midterm', gradeUpload?.midterm)}
            finalLock={lockedReason('final', gradeUpload?.final)}
        />
    )
}
