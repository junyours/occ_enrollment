import { Badge } from '@/Components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import React, { useEffect, useState } from 'react'
import { computeFinalGrade } from '../Grades/GradeUtility';

function StudentSubjectsGrades({ schoolYearId, studentId }) {
    const [subjects, setSubjects] = useState([])

    const getStudentSubjects = async () => {
        await axios.post(route('enrollment-record.student.subjects.grades', { schoolYearId, studentId }))
            .then((response) => {
                setSubjects(response.data);
            })
    }

    useEffect(() => {
        getStudentSubjects();
    }, [schoolYearId, studentId]);

    return (
        <div className="self-start">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Subject</TableHead>
                        <TableHead>Midterm</TableHead>
                        <TableHead>Final</TableHead>
                        <TableHead>Final Rating</TableHead>
                        <TableHead>Remarks</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {subjects.map((classInfo) => {
                        const finalGrade = computeFinalGrade(classInfo.midterm_grade, classInfo.final_grade);
                        const isDropped = classInfo.midterm_grade == 0.0 || classInfo.final_grade == 0.0;
                        const isPassed = !isDropped && classInfo.midterm_grade && classInfo.final_grade && finalGrade <= 3;
                        const isFailed = !isDropped && classInfo.midterm_grade && classInfo.final_grade && finalGrade > 3;

                        return (
                            <React.Fragment key={classInfo.id}>
                                <TableRow>
                                    <TableCell>{classInfo.descriptive_title}</TableCell>
                                    <TableCell>{classInfo.midterm_grade}</TableCell>
                                    <TableCell>{classInfo.final_grade}</TableCell>
                                    <TableCell>
                                        {finalGrade || '-'}
                                    </TableCell>
                                    <TableCell>
                                        {isDropped ? (
                                            <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200 font-semibold">
                                                DROPPED
                                            </Badge>
                                        ) : isPassed ? (
                                            <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200 font-semibold">
                                                PASSED
                                            </Badge>
                                        ) : isFailed ? (
                                            <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border-red-200 font-semibold">
                                                FAILED
                                            </Badge>
                                        ) : (
                                            <span className="text-slate-400">-</span>
                                        )}
                                    </TableCell>
                                </TableRow>
                            </React.Fragment>
                        )
                    })}
                </TableBody>
            </Table>
        </div>
    )
}

export default StudentSubjectsGrades