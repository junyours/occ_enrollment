import React from 'react'
import { useState } from 'react'
import InstructorGradeSubmitionButton from '../../ClassComponents/GradePartials/InstructorGradeSubmitionButton';
import { toast } from 'sonner';
import { AlertCircle, CheckCircle, ChevronDown, ChevronUp, FileText, Rocket, Send, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/Components/ui/card';
import axios from 'axios';

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


export default function SubmitButton({ nstpSectionId, allowMidtermUpload, allowFinalUpload, localGrades, setMissingFields, gradeSubmissionStatus, refetchGradeSubmissionStatus }) {
    const [submitting, setSubmitting] = useState(false);
    const [expandedRejection, setExpandedRejection] = useState({ midterm: false, final: false });

    const validateGradesBeforeSubmit = (type) => {
        const missing = {};

        // [key, value] iteration
        Object.entries(localGrades).forEach(([studentId, student]) => {
            const missingMidterm = type === 'midterm' ? (student.midterm_grade === '' || student.midterm_grade === null || student.midterm_grade === undefined) : false;
            const missingFinal = type === 'final' ? (student.final_grade === '' || student.final_grade === null || student.final_grade === undefined) : false;

            if (missingMidterm || missingFinal) {
                // Use the actual student ID instead of a random array index
                missing[studentId] = {
                    midterm: missingMidterm,
                    final: missingFinal,
                };
            }
        });

        setMissingFields(missing);

        if (Object.keys(missing).length !== 0) {
            toast.error("Please fill all grade fields before submitting.");
        }

        return Object.keys(missing).length === 0;
    }
    const handleSubmit = async (type) => {
        if (!validateGradesBeforeSubmit(type)) return;

        setSubmitting(type);

        try {
            const url = route('nstp-grades.submit-grades', {
                period: type,
                nstpSectionId
            });

            await axios.post(url);

            toast.success('Grades submitted successfully.');

        } catch (error) {
            toast.error(error.response?.data?.message ?? 'Something went wrong.');
            return;

        } finally {
            await refetchGradeSubmissionStatus();
            setSubmitting(false);
        }
    };

    const handleCancel = async (type) => {
        setSubmitting(type)

        try {
            const url = route('nstp-grades.cancel-submission', {
                period: type,
                nstpSectionId
            });

            await axios.post(url);

            toast.warning('Submission cancelled.');
        } catch (error) {
            toast.error(error.response?.data?.message ?? 'Something went wrong.');
        } finally {
            await refetchGradeSubmissionStatus();
            setSubmitting(false);
        }
    }

    return (
        <div className='fixed bottom-0 z-50 flex gap-4 w-full max-w-6xl h-28 px-4'>
            <Card className='no-print w-96 mb-4'>
                <CardHeader className='flex-row justify-between px-4 mt-2 space-y-0 items-center'>
                    {/* Rejection message for midterm */}
                    <p className='underline w-max'>Midterm grade</p>

                    {/* <GradeRequestEditAction
                        gradeSubmissionStatus={data.midterm_status}
                        isDisabled={submitting}
                        handleRequestEdit={handleRequestEdit}
                        type='midterm'
                        requestStatus={midtermRequestStatus}
                        handleCancelRequestEdit={handleCancelRequestEdit}
                    /> */}

                    {(gradeSubmissionStatus.midterm_status == 'rejected' && gradeSubmissionStatus.midterm_rejection_message) && (
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
                                    {gradeSubmissionStatus.midterm_rejection_message}
                                </div>
                            )}
                        </div>
                    )}
                </CardHeader>
                <CardContent className='py-2 px-4 space-y-2'>
                    <div className='w-full flex gap-4 max-w-7xl mx-auto'>
                        <div className='w-48 flex border px-2 h-[37px]'>
                            <StatusLabel label={gradeSubmissionStatus.midterm_status} />
                        </div>

                        <InstructorGradeSubmitionButton
                            handleSubmit={handleSubmit}
                            disabledButton={!allowMidtermUpload || submitting === 'midterm'}
                            handleCancel={handleCancel}
                            type='midterm'
                            status={{
                                deployed_at: gradeSubmissionStatus.midterm_deployed_at,
                                rejection_message: gradeSubmissionStatus.midterm_rejection_message,
                                status: gradeSubmissionStatus.midterm_status,
                                submitted_at: gradeSubmissionStatus.midterm_submitted_at,
                                verified_at: gradeSubmissionStatus.midterm_verified_at,
                            }}
                        />
                    </div>
                </CardContent>
            </Card>

            <Card className='no-print w-96 mb-4'>
                <CardHeader className='flex-row justify-between px-4 mt-2 space-y-0 items-center'>
                    {/* Rejection message for midterm */}
                    <p className='underline w-max'>Final grade</p>

                    {/* <GradeRequestEditAction
                        gradeSubmissionStatus={data.midterm_status}
                        isDisabled={submitting}
                        handleRequestEdit={handleRequestEdit}
                        type='midterm'
                        requestStatus={midtermRequestStatus}
                        handleCancelRequestEdit={handleCancelRequestEdit}
                    /> */}

                    {(gradeSubmissionStatus.final_status == 'rejected' && gradeSubmissionStatus.final_rejection_message) && (
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
                                    {gradeSubmissionStatus.final_rejection_message}
                                </div>
                            )}
                        </div>
                    )}
                </CardHeader>
                <CardContent className='py-2 px-4 space-y-2'>
                    <div className='w-full flex gap-4 max-w-7xl mx-auto'>
                        <div className='w-48 flex border px-2 h-[37px]'>
                            <StatusLabel label={gradeSubmissionStatus.final_status} />
                        </div>

                        <InstructorGradeSubmitionButton
                            handleSubmit={handleSubmit}
                            disabledButton={!allowFinalUpload || submitting === 'final'}
                            handleCancel={handleCancel}
                            type='final'
                            status={{
                                deployed_at: gradeSubmissionStatus.final_deployed_at,
                                rejection_message: gradeSubmissionStatus.final_rejection_message,
                                status: gradeSubmissionStatus.final_status,
                                submitted_at: gradeSubmissionStatus.final_submitted_at,
                                verified_at: gradeSubmissionStatus.final_verified_at,
                            }}
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
