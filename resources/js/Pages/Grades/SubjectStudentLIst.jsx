import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { convertToAMPM, formatFullName } from '@/Lib/Utils';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Check, CheckCircle, Clock, SendHorizonal, XCircle } from 'lucide-react';
import { Button } from '@/Components/ui/button';
import { router } from '@inertiajs/react';
import { Popover, PopoverContent, PopoverTrigger } from '@/Components/ui/popover';
import { Input } from '@/Components/ui/input';
import { Label } from '@/Components/ui/label';
import GradeSubmissionStatus from '../InstructorClasses/ClassComponents/GradePartials/GradeSubmissionStatus';

function SubjectStudentLIst({ faculty, subject }) {
    const [studentList, setStudentList] = useState([]);
    const [rejectionMessage, setRejectionMessage] = useState('');

    const selectSubject = async () => {
        await axios.post(route('faculty.subjects.students'), { yearSectionSubjectsId: subject.id })
            .then(response => {
                setStudentList(response.data);
            })
    }

    useEffect(() => {
        selectSubject();
    }, [subject.id])


    const verify = async () => {
        router.post(
            route('verify.grades', { yearSectionSubjectsId: subject.id }),
            {},
            {
                preserveScroll: true,
            }
        )
    }

    const cancel = async () => {
        router.post(
            route('grade-verification.cancel', { yearSectionSubjectsId: subject.id }),
            {},
            {
                preserveScroll: true,
            }
        )
    }

    const handleReject = () => {
        router.post(
            route('reject.grades', { yearSectionSubjectsId: subject.id }), { message: rejectionMessage },
            {},
            {
                preserveScroll: true,
            }
        )
    }

    const [loading, setLoading] = useState(false)

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
                <GradeSubmissionStatus className='w-max' gradeStatus={subject} />
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
                                                (() => {
                                                    const avg = (+student.midterm_grade + +student.final_grade) / 2;
                                                    const finalRating = avg >= 3.05 ? 5.0 : +avg.toFixed(1);
                                                    return <>{finalRating.toFixed(1)}</>;
                                                })()
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
                {
                    subject.is_deployed ? (<span className="inline-flex items-center gap-1 px-2 py-1 text-sm font-medium text-white bg-green-600 rounded-md">
                        Deployed <Check className="w-4 h-4" />
                    </span>
                    ) : subject.is_verified ? (
                        <div className="w-full flex items-end justify-end">
                            <div className="flex flex-col gap-1 text-sm bg-blue-600 border border-blue-300 rounded-xl px-4 py-3 shadow-md max-w-md w-fit">
                                <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4" />
                                    <span>
                                        Verified on <span className="font-semibold">{subject.verified_at}</span> at{' '}
                                        <span className="font-semibold">{convertToAMPM(subject)}</span>
                                    </span>
                                </div>
                                <span className="pl-6 text-sm italic">Awaiting deployment</span>
                                <Button
                                    onClick={async () => {
                                        setLoading(true)
                                        try {
                                            await cancel()
                                        } finally {
                                            setLoading(false)
                                        }
                                    }}
                                    variant='destructive'
                                    disabled={loading}
                                >
                                    Cancel
                                </Button>
                            </div>
                        </div>
                    ) : subject.is_rejected ? (<span className="inline-flex items-center gap-1 px-2 py-1 text-sm font-medium text-white bg-red-600 rounded-md">
                        Rejected <XCircle className="w-4 h-4" />
                    </span>
                    ) : subject.is_submitted ? (
                        <div className='flex gap-2'>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="destructive" className="w-28">Reject</Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-64 space-y-2">
                                    <Label htmlFor="rejection-message">Message <span className='text-xs italic'>(not required)</span></Label>
                                    <Input
                                        id="rejection-message"
                                        value={rejectionMessage}
                                        onChange={(e) => setRejectionMessage(e.target.value)}
                                        className="w-full"
                                        placeholder="Enter reason for rejection"
                                    />
                                    <Button onClick={handleReject}>
                                        Send <SendHorizonal className="ml-2 h-4 w-4" />
                                    </Button>
                                </PopoverContent>
                            </Popover>
                            <Button onClick={verify} className='w-28'>Verify</Button>
                        </div>
                    ) : (
                        ''
                    )
                }
            </div>
        </div>
    )
}

export default SubjectStudentLIst
SubjectStudentLIst.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
