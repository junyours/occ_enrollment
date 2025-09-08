import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import React, { useEffect, useState } from 'react'

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
                    {subjects.map((classInfo) => (
                        <React.Fragment key={classInfo.id}>
                            <TableRow>
                                <TableCell>{classInfo.descriptive_title}</TableCell>
                                <TableCell>{classInfo.midterm_grade}</TableCell>
                                <TableCell>{classInfo.final_grade}</TableCell>
                                <TableCell>{
                                    classInfo.midterm_grade === 0.0 || classInfo.final_grade === 0.0 ? (
                                        <span className="text-red-500 font-medium">DROPPED</span>
                                    ) : classInfo.midterm_grade && classInfo.final_grade ? (
                                        (() => {
                                            const avg = (+classInfo.midterm_grade + +classInfo.final_grade) / 2;
                                            const finalRating = avg >= 3.05 ? 5.0 : +avg;
                                            return <>{(Math.round(finalRating * 10) / 10).toFixed(1)}</>;
                                        })()
                                    ) : (
                                        '-'
                                    )}
                                </TableCell>
                                <TableCell>
                                    {
                                        classInfo.midterm_grade === 0.0 || classInfo.final_grade === 0.0 ? (
                                            <span className="text-red-500 font-medium">DROPPED</span>
                                        ) : classInfo.midterm_grade && classInfo.final_grade ? (
                                            ((+classInfo.midterm_grade + +classInfo.final_grade) / 2).toFixed(1) > 3 ? (
                                                <span className="text-red-500 font-medium">FAILED</span>
                                            ) : (
                                                <span className="text-green-600 font-medium">PASSED</span>
                                            )
                                        ) : (
                                            '-'
                                        )
                                    }
                                </TableCell>
                            </TableRow>
                        </React.Fragment>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}

export default StudentSubjectsGrades