import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { formatFullName } from '@/Lib/Utils';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { AlertCircle, ArrowLeft, BookOpen, CheckCircle, FileText, Loader2, Rocket, Send, XCircle } from 'lucide-react';
import { router } from '@inertiajs/react';
import { useGradeSubmission } from '../InstructorClasses/ClassComponents/GradePartials/useGradeSubmission';
import RegistrarHeadGradeDeploymentButton from './RegistrarHeadGradeDeploymentButton';

import { toast } from "sonner";
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/Components/ui/badge';
import { computeFinalGrade } from './GradeUtility';

const statusMap = {
    draft: { color: "text-gray-500", icon: FileText },
    submitted: { color: "text-blue-500", icon: Send },
    verified: { color: "text-green-600", icon: CheckCircle },
    rejected: { color: "text-red-500", icon: XCircle },
    deployed: { color: "text-indigo-600", icon: Rocket },
}

function StatusLabel({ label }) {
    const status = label?.toLowerCase?.()
    const { color, icon: Icon } = statusMap[status] || {}

    return (
        <p className={`flex items-center gap-1`}>
            {Icon && <Icon size={16} />}
            Status: <span className={`font-semibold ${color}`}>{status ? status.charAt(0).toUpperCase() + status.slice(1) : "—"}</span>
        </p>
    )
}

function VerifiedSubjectStudentLIst({ faculty, subject }) {

    const { data, isLoading, refetch } = useGradeSubmission(subject.id);
    const [submitting, setSubimitting] = useState(false);

    const selectSubject = async () => {
        await axios.post(route('faculty.verified.subjects.students'), { yearSectionSubjectsId: subject.id })
            .then(response => {
                setStudentList(response.data);
            })
    }

    useEffect(() => {
        selectSubject();
    }, [subject.id])

    const fetchSubjectsStudents = async () => {
        const response = await axios.post(route('faculty.verified.subjects.students'), { yearSectionSubjectsId: subject.id });
        return response.data;
    };

    const { data: studentList, isLoading: studentLoading, isError } = useQuery({
        queryKey: ['faculty.verified.subjects.students', subject.id],
        queryFn: fetchSubjectsStudents,
        enabled: !!subject.id,
    });


    const deploy = async (type) => {
        setSubimitting(true);
        const routeName =
            type === "final"
                ? "deploy.final-grades"
                : "deploy.midterm-grades";

        router.post(
            route(routeName, { yearSectionSubjectsId: subject.id }),
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success("Deployed successfully");
                },
                onError: (errors) => {
                    if (errors && errors.grades) {

                    } else {
                        toast.error("Failed to submit");
                    }
                },
                onFinish: async () => {
                    await refetch();
                    setSubimitting(false);
                }
            }
        )
    }

    const unDeploy = async (type) => {
        setSubimitting(true);
        const routeName =
            type === "final"
                ? "undeploy.final-grades"
                : "undeploy.midterm-grades";

        router.post(
            route(routeName, { yearSectionSubjectsId: subject.id }),
            {},
            {
                preserveScroll: true,
                onError: (errors) => {
                    if (errors && errors.grades) {

                    } else {
                        toast.error("Failed to submit");
                    }
                },
                onFinish: async () => {
                    await refetch();
                    setSubimitting(false);
                }
            }
        )
    }

    return (
        <div className='space-y-4'>
            <div className='flex justify-between'>
                <div className='flex gap-2 h-min self-end'>
                    <Card
                        className='cursor-pointer hover:bg-gray-100'
                        onClick={() => window.history.back()}
                    >
                        <CardContent className='flex items-center gap-2 px-4 py-2'>
                            <ArrowLeft className='w-5 h-5' />
                            <span>Back</span>
                        </CardContent>
                    </Card>
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
                {/* <GradeSubmissionStatus gradeStatus={subject} /> */}
            </div>
            <Card>
                <CardHeader>
                    <CardTitle className='text-lg mb-2'>{subject.descriptive_title}</CardTitle>
                </CardHeader>
                <CardContent>
                    {studentLoading ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                            <Loader2 className="w-8 h-8 animate-spin mb-3" />
                            <p className="text-sm">Loading requests...</p>
                        </div>
                    ) : isError ? (
                        <div className="flex flex-col items-center justify-center py-12 text-destructive">
                            <AlertCircle className="w-8 h-8 mb-3" />
                            <p className="text-sm font-medium">Failed to load requests</p>
                            <p className="text-xs text-muted-foreground mt-1">Please try again later</p>
                        </div>
                    ) : studentList.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                            <BookOpen className="w-12 h-12 mb-3 opacity-30" />
                            <p className="text-sm font-medium">No requests</p>
                            <p className="text-xs mt-1">Check back later or contact administration</p>
                        </div>
                    ) : (
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
                                {studentList.map((student, index) => {
                                    const finalGrade = computeFinalGrade(student.midterm_grade, student.final_grade);
                                    const isDropped = student.midterm_grade == 0.0 || student.final_grade == 0.0;
                                    const isPassed = !isDropped && student.midterm_grade && student.final_grade && finalGrade <= 3;
                                    const isFailed = !isDropped && student.midterm_grade && student.final_grade && finalGrade > 3;
                                    return (
                                        <TableRow key={index}>
                                            <TableCell className="text-center">{index + 1}.</TableCell>
                                            <TableCell>{student.user_id_no}</TableCell>
                                            <TableCell>{formatFullName(student)}</TableCell>
                                            <TableCell className="text-center">{student.midterm_grade?.toFixed(1)}</TableCell>
                                            <TableCell className="text-center">{student.final_grade?.toFixed(1)}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {finalGrade || '-'}
                                            </TableCell>
                                            <TableCell className="text-center">
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
                                    )
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <div className='h-24' />

            {/* OUTSIDE the scrollable container */}
            {!isLoading && (
                <div className='fixed bottom-0 z-50 flex gap-4 w-full max-w-6xl h-28 px-4'>
                    {/* Midterm (will appear on the right) */}
                    <Card className='rounded-none no-print w-96 mb-4'>
                        <CardHeader className='flex-row justify-between px-4 mt-2'>
                            {/* Rejection message for midterm */}
                            <p className='underline w-max'>Midterm grade</p>
                            {(data.midterm_status == 'rejected' && data.midterm_rejection_message) && (
                                <div className="relative">
                                    <button
                                        onClick={() => setExpandedRejection({ ...expandedRejection, midterm: !expandedRejection.midterm })}
                                        className="flex items-center gap-1 text-xs text-red-500 hover:text-red-800 font-medium"
                                    >
                                        <AlertCircle className="w-3 h-3" />
                                        View reason
                                        {expandedRejection.midterm ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
                                    </button>
                                    {expandedRejection.midterm && (
                                        <div className="absolute bottom-full left-0 mb-2 p-3 bg-red-50 border border-red-200 rounded-lg shadow-lg text-xs text-red-900 w-64 z-50">
                                            {data.midterm_rejection_message}
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardHeader>
                        <CardContent className='py-2 px-4 space-y-2'>
                            <div className='w-full flex gap-4 max-w-7xl mx-auto'>
                                <div className='w-48 flex border px-2 h-[37px]'>
                                    <StatusLabel label={data.midterm_status} />
                                </div>
                                <RegistrarHeadGradeDeploymentButton
                                    deploy={deploy}
                                    disabledButton={!data.midterm_status == 'verified' || submitting}
                                    unDeploy={unDeploy}
                                    type='midterm'
                                    status={{
                                        deployed_at: data.midterm_deployed_at,
                                        rejection_message: data.midterm_rejection_message,
                                        status: data.midterm_status,
                                        submitted_at: data.midterm_submitted_at,
                                        verified_at: data.midterm_verified_at,
                                    }}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Final (will appear on the left) */}
                    <Card className='rounded-none no-print w-96 mb-4'>
                        <CardHeader className='flex-row justify-between px-4 mt-2'>
                            {/* Rejection message for midterm */}
                            <p className='underline w-max'>Final grade</p>
                            {(data.final_status == 'rejected' && data.final_rejection_message) && (
                                <div className="relative">
                                    <button
                                        onClick={() => setExpandedRejection({ ...expandedRejection, final: !expandedRejection.final })}
                                        className="flex items-center gap-1 text-xs text-red-500 hover:text-red-800 font-medium"
                                    >
                                        <AlertCircle className="w-3 h-3" />
                                        View reason
                                        {expandedRejection.final ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
                                    </button>
                                    {expandedRejection.final && (
                                        <div className="absolute bottom-full left-0 mb-2 p-3 bg-red-50 border border-red-200 rounded-lg shadow-lg text-xs text-red-900 w-64 z-50">
                                            {data.final_rejection_message}
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardHeader>
                        <CardContent className='py-2 px-4 space-y-2'>
                            <div className='w-full flex gap-4 max-w-7xl mx-auto'>
                                <div className='w-48 flex border px-2 h-[37px]'>
                                    <StatusLabel label={data.final_status} />
                                </div>
                                <RegistrarHeadGradeDeploymentButton
                                    deploy={deploy}
                                    disabledButton={!!data.final_status == 'verified' || submitting}
                                    unDeploy={unDeploy}
                                    type='final'
                                    status={{
                                        deployed_at: data.final_deployed_at,
                                        rejection_message: data.final_rejection_message,
                                        status: data.final_status,
                                        submitted_at: data.final_submitted_at,
                                        verified_at: data.final_verified_at,
                                    }}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* <div className='w-full flex justify-end'>
                {!subject.is_deployed && !subject.is_rejected && subject.is_verified ? (
                    <Button onClick={deploy} className='w-28'>Deploy</Button>
                ) : (
                    <></>
                )}
            </div> */}
        </div>
    )
}

export default VerifiedSubjectStudentLIst
VerifiedSubjectStudentLIst.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
