import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { formatFullName } from '@/Lib/Utils';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Check, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/Components/ui/button';
import { router } from '@inertiajs/react';
import GradeSubmissionStatus from '../InstructorClasses/ClassComponents/GradePartials/GradeSubmissionStatus';

function VerifiedSubjectStudentLIst({ faculty, subject }) {
    const [studentList, setStudentList] = useState([]);

    const selectSubject = async () => {
        await axios.post(route('faculty.verified.subjects.students'), { yearSectionSubjectsId: subject.id })
            .then(response => {
                setStudentList(response.data);
            })
    }

    useEffect(() => {
        selectSubject();
    }, [subject.id])


    const deploy = async () => {
        router.post(
            route('deploy.grades', { yearSectionSubjectsId: subject.id }),
            {},
            {
                preserveScroll: true,
            }
        )
    }

    return (
        <div className='space-y-4'>
            <div className='flex justify-between'>
                <div className='flex gap-2 h-min self-end'>
                    <Card className='w-max'>
                        <CardContent className='px-4 py-2'>
                            <h1>{faculty.name.toUpperCase()}</h1>
                        </CardContent>
                    </Card>
                    <Card className='w-max'>
                        <CardContent className='px-4 py-2'>
                            <h1>{subject.course_name_abbreviation}-{subject.year_level_id}{subject.section}</h1>
                        </CardContent>
                    </Card>
                </div>
                <GradeSubmissionStatus gradeStatus={subject} />
            </div>
            <Card>
                <CardHeader>
                    <CardTitle className='text-lg mb-2'>{subject.descriptive_title}</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-8 text-center">#</TableHead>
                                <TableHead>ID NUMBER</TableHead>
                                <TableHead>STUDENT NAME</TableHead>
                                <TableHead className="text-center">MIDTERM</TableHead>
                                <TableHead className="text-center">FINAL</TableHead>
                                <TableHead className="text-center">FINAL RATING</TableHead>
                                <TableHead className="text-center">REMARKS</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {studentList.map((student, index) => (
                                <TableRow key={index}>
                                    <TableCell className="text-center">{index + 1}.</TableCell>
                                    <TableCell>{student.user_id_no}</TableCell>
                                    <TableCell>{formatFullName(student)}</TableCell>
                                    <TableCell className="text-center">{student.midterm_grade}</TableCell>
                                    <TableCell className="text-center">{student.final_grade}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {student.midterm_grade === 0.0 || student.final_grade === 0.0 ? (
                                            <span className="text-red-500 font-medium">DROPPED</span>
                                        ) : student.midterm_grade && student.final_grade ? (
                                            ((+student.midterm_grade + +student.final_grade) / 2).toFixed(1)
                                        ) : (
                                            '-'
                                        )}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {student.midterm_grade === 0.0 || student.final_grade === 0.0 ? (
                                            <span className="text-red-500 font-medium">DROPPED</span>
                                        ) : student.midterm_grade && student.final_grade ? (
                                            ((+student.midterm_grade + +student.final_grade) / 2).toFixed(1) > 3 ? (
                                                <span className="text-red-500 font-medium">FAILED</span>
                                            ) : (
                                                <span className="text-green-600 font-medium">PASSED</span>
                                            )
                                        ) : (
                                            '-'
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <div className='w-full flex justify-end'>
                {!subject.is_deployed && !subject.is_rejected && subject.is_verified ? (
                    <Button onClick={deploy} className='w-28'>Deploy</Button>
                ) : (
                    <></>
                )}
            </div>
        </div>
    )
}

export default VerifiedSubjectStudentLIst
VerifiedSubjectStudentLIst.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
