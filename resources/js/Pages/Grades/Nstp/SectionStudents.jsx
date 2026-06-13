import BackButton from '@/Components/ui/BackButton';
import { Card, CardContent, CardDescription, CardHeader } from '@/Components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout'
import { formatName } from '@/Lib/InfoUtils';
import { Head } from '@inertiajs/react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import React, { useState } from 'react'
import { computeFinalGrade } from '../GradeUtility';
import GradeRemarkBadge from '@/Components/GradeRemarkBadge';
import { cn } from '@/Lib/Utils';
import { CheckCircle, FileText, Rocket, Send, XCircle } from 'lucide-react';
import ProgramHeadGradeVerificationButton from '../ProgramHeadGradeVerificationButton';
import { toast } from 'sonner';


/* ==========================================================================
   Helpers
   ========================================================================== */
const CardTableHead = ({ children }) => (
    <Card>
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

const Header = ({ section, faculty }) => (
    <div>
        <Head title={section} />
        <div className='flex justify-between'>
            <div className='flex gap-2 h-min self-end'>
                <BackButton />
                <Card className='w-max'>
                    <CardContent className='px-4 py-2'>
                        <h1>{formatName(faculty, { casing: 'upper' })}</h1>
                    </CardContent>
                </Card>
                <Card className='w-max'>
                    <CardContent className='px-4 py-2'>
                        <h1>{section}</h1>
                    </CardContent>
                </Card>
            </div>
        </div>
    </div>
)

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

export default function SectionStudents({ nstpSection, faculty }) {

    /* ==========================================================================
       Initialize Data
       ========================================================================== */

    // Submission Status
    const getNstpSectionGradeSubmissionStatus = async () => {
        try {
            const url = route('nstp-section.grade-submission-status', { id: nstpSection.id });

            const response = await axios.get(url);

            return response.data;
        } catch (error) {
            toast.error('Something went wrong! Please try refreshing your browser');
            throw error;
        }
    }

    const { data: gradeSubmissionStatus, isLoading: statusLoading, isError: isStatusError, refetch: refetchError } = useQuery({
        queryKey: ['nstp-section.grade-submission-status', nstpSection.id],
        queryFn: getNstpSectionGradeSubmissionStatus,
        enabled: !!nstpSection.id,
        staleTime: 5 * 60 * 1000,
    });

    // Student List
    const getStudentNstpGrades = async () => {
        try {
            const response = await axios.post(route('nstp.students-grades', { id: nstpSection.id }));
            return response.data;
        } catch (error) {
            toast.error('Something went wrong! Please try refreshing your browser');
            throw error;
        }
    }

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['nstp.subject-students-grade', nstpSection?.id, faculty?.id],
        queryFn: getStudentNstpGrades,
        enabled: !!nstpSection?.id && !!faculty?.id,
    });


    /* ==========================================================================
       States
       ========================================================================== */
    const [rejectionMessage, setRejectionMessage] = useState('');
    const [submitting, setSubmitting] = useState(false);


    /* ==========================================================================
       NSTP Director actions
       ========================================================================== */
    const verify = async (type) => {
        setSubmitting(type)

        try {
            const url = route('nstp.verify-grades', {
                period: type,
                sectionId: nstpSection.id
            });

            await axios.post(url);

            toast.success('Grades verified successfully.');

        } catch (error) {
            toast.error(error.response?.data?.message ?? 'Something went wrong.');
            setSubmitting(false)
            return;
        } finally {
            await refetchError();
            setSubmitting(false)
        }
    }

    const unVerify = async (type) => {
        setSubmitting(type)

        try {
            const url = route('nstp.unverify-grades', {
                period: type,
                sectionId: nstpSection.id
            });

            await axios.post(url);

            toast.success('Unverified');

        } catch (error) {
            toast.error(error.response?.data?.message ?? 'Something went wrong.');
            setSubmitting(false)
            return;
        } finally {
            await refetchError();
            setSubmitting(false)
        }
    }

    const handleReject = async (type) => {
        setSubmitting(type)

        try {
            const url = route('nstp.reject-grades', {
                period: type,
                sectionId: nstpSection.id
            });

            await axios.post(url, { message: rejectionMessage });

            toast.success('Rejected!');
            setRejectionMessage('');

        } catch (error) {
            toast.error(error.response?.data?.message ?? 'Something went wrong.');
            setSubmitting(false)
            return;
        } finally {
            await refetchError();
            setSubmitting(false)
        }
    }

    const unReject = async (type) => {
        setSubmitting(type)

        try {
            const url = route('nstp.unreject-grades', {
                period: type,
                sectionId: nstpSection.id
            });

            await axios.post(url, { message: rejectionMessage });

            toast.success('Unrejected!');
            setRejectionMessage('');

        } catch (error) {
            toast.error(error.response?.data?.message ?? 'Something went wrong.');
            setSubmitting(false)
            return;
        } finally {
            await refetchError();
            setSubmitting(false)
        }
    }

    /* ==========================================================================
       Render
       ========================================================================== */

    const section = `${nstpSection.component_name.toUpperCase()}-${nstpSection.section.toUpperCase()}`

    if (isError || isStatusError) return <>Error loading grades.</>;
    if (isLoading || !data || statusLoading || !gradeSubmissionStatus) return (
        <div className='space-y-4'>
            <Header section={section} faculty={faculty} />
            <Skeleton />
        </div>
    );

    return (
        <div className='space-y-4'>
            <Header section={section} faculty={faculty} />
            <CardTableHead>
                {data.map((student, index) => {
                    const finalGrade = computeFinalGrade(student.midterm_grade, student.final_grade);

                    return (
                        <TableRow
                            key={student.user_id_no}
                            className='p-0 print:p-0'
                        >
                            <TableCell className={cn('text-center')}>{index + 1}.</TableCell>
                            <TableCell>{student.user_id_no}</TableCell>
                            <TableCell>{formatName(student, { format: 'LFM' })}</TableCell>

                            <TableCell className={cn('text-center')}>
                                <div>{student.midterm_grade ? Number(student.midterm_grade).toFixed(1) : ''}</div>
                            </TableCell>

                            <TableCell className={cn('text-center')}>
                                <div>{student.final_grade ? Number(student.final_grade).toFixed(1) : ''}</div>
                            </TableCell>

                            <TableCell className={cn('text-center')}>
                                {finalGrade || '-'}
                            </TableCell>

                            <TableCell className={cn('text-center')}>
                                <GradeRemarkBadge midterm={student.midterm_grade} final={student.final_grade} />
                            </TableCell>
                        </TableRow>
                    );
                })}
            </CardTableHead>

            <BackButton />

            <div className='h-24' />

            {!statusLoading && (
                <div className='fixed bottom-0 z-50 flex gap-4 w-full max-w-6xl h-28 px-4'>
                    {/* Midterm (will appear on the right) */}
                    <Card className='no-print w-96 mb-4'>
                        <CardContent className='py-2 px-4 space-y-2'>
                            <p className='underline'>Midterm grade</p>
                            <div className='w-full flex gap-4 max-w-7xl mx-auto'>
                                <div className='w-48 flex border px-2 h-[37px]'>
                                    <StatusLabel label={gradeSubmissionStatus.midterm_status} />
                                </div>
                                <ProgramHeadGradeVerificationButton
                                    disabledButton={submitting == 'midterm'}
                                    handleCancel={unVerify}
                                    type='midterm'
                                    status={{
                                        deployed_at: gradeSubmissionStatus.midterm_deployed_at,
                                        rejection_message: gradeSubmissionStatus.midterm_rejection_message,
                                        status: gradeSubmissionStatus.midterm_status,
                                        submitted_at: gradeSubmissionStatus.midterm_submitted_at,
                                        verified_at: gradeSubmissionStatus.midterm_verified_at,
                                    }}
                                    rejectionMessage={rejectionMessage}
                                    setRejectionMessage={setRejectionMessage}
                                    handleReject={handleReject}
                                    verify={verify}
                                    unReject={unReject}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Final (will appear on the left) */}
                    <Card className='no-print w-96 mb-4'>
                        <CardContent className='py-2 px-4 space-y-2'>
                            <p className='underline'>Final grade</p>
                            <div className='w-full flex gap-4 max-w-7xl mx-auto'>
                                <div className='w-48 flex border px-2 h-[37px]'>
                                    <StatusLabel label={gradeSubmissionStatus.final_status} />
                                </div>
                                <ProgramHeadGradeVerificationButton
                                    disabledButton={submitting == 'final'}
                                    handleCancel={unVerify}
                                    type='final'
                                    status={{
                                        deployed_at: gradeSubmissionStatus.final_deployed_at,
                                        rejection_message: gradeSubmissionStatus.final_rejection_message,
                                        status: gradeSubmissionStatus.final_status,
                                        submitted_at: gradeSubmissionStatus.final_submitted_at,
                                        verified_at: gradeSubmissionStatus.final_verified_at,
                                    }}
                                    rejectionMessage={rejectionMessage}
                                    setRejectionMessage={setRejectionMessage}
                                    handleReject={handleReject}
                                    verify={verify}
                                    unReject={unReject}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    )
}

SectionStudents.layout = (page) => <AuthenticatedLayout children={page} />  