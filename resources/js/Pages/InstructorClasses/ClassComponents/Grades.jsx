import React, { useEffect, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { Button } from '@/Components/ui/button'
import { Download, FileDown, Printer, Upload, Cloud, CloudUpload, AlertCircle, ChevronUp, ChevronDown } from 'lucide-react'
import axios from 'axios'
import GradesStudentList from './GradePartials/GradesStudentList'
import { useToast } from "@/hooks/use-toast";
import { router, usePage } from '@inertiajs/react'
import { Card, CardContent, CardHeader } from '@/Components/ui/card'
import { useReactToPrint } from 'react-to-print';
import GradeSignatories from './GradePartials/GradeSignatories'
import GradeHeader from './GradePartials/GradeHeader'
import { useGradeSubmission } from './GradePartials/useGradeSubmission'
import PreLoader from '@/Components/preloader/PreLoader'
import {
    FileText,
    Send,
    CheckCircle,
    XCircle,
    Rocket,
} from "lucide-react"
import InstructorGradeSubmitionButton from './GradePartials/InstructorGradeSubmitionButton'
import GradeRequestEditAction from './GradePartials/GradeRequestEditAction'

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

function Grades({
    students,
    subjectCode,
    descriptiveTitle,
    courseSection,
    yearSectionSubjectsId,
    gradeStatus,
    getClassStudents,
    schoolYear }) {

    const { toast } = useToast();

    const { user } = usePage().props.auth

    const [grades, setGrades] = useState(
        students.map((student) => ({
            id_number: student.user_id_no,
            name: `${student.last_name}, ${student.first_name} ${student.middle_name?.charAt(0) || ''}.`,
            midterm_grade: student.midterm_grade !== null && student.midterm_grade !== undefined
                ? Number(student.midterm_grade).toFixed(1)
                : '',
            final_grade: student.final_grade !== null && student.final_grade !== undefined
                ? Number(student.final_grade).toFixed(1)
                : '',
        }))
    )

    const [missingFields, setMissingFields] = useState({})

    const [expandedRejection, setExpandedRejection] = useState({ midterm: false, final: false });

    // Upload status state: 'idle' | 'uploading' | 'saved'
    const [uploadStatus, setUploadStatus] = useState('saved')
    const uploadStatusTimeoutRef = useRef(null)

    const validateGradesBeforeSubmit = (type) => {
        const missing = {}

        grades.forEach((student, index) => {
            const missingMidterm = type == 'midterm' ? (student.midterm_grade === '' || student.midterm_grade === null || student.midterm_grade === undefined) : false
            const missingFinal = type == 'final' ? (student.final_grade === '' || student.final_grade === null || student.final_grade === undefined) : false

            if (missingMidterm || missingFinal) {
                missing[index] = {
                    midterm: missingMidterm,
                    final: missingFinal,
                }
            }
        })

        setMissingFields(missing)

        if (Object.keys(missing).length != 0) {
            toast({
                description: "Fill all grade fields.",
                variant: "destructive",
            })
        }

        return Object.keys(missing).length === 0
    }

    const fileInputRef = useRef(null)

    const handleChange = (index, field, value) => {
        const updated = [...grades]
        updated[index][field] = value
        setGrades(updated)
    }

    const downloadExcel = () => {
        const worksheetData = grades.map((s) => ({
            'ID NUMBER': s.id_number,
            NAME: s.name,
            MIDTERM: s.midterm,
            FINAL: s.final,
        }))
        const worksheet = XLSX.utils.json_to_sheet(worksheetData)
        worksheet['!cols'] = [
            { wch: 15 },
            { wch: 30 },
            { wch: 10 },
            { wch: 10 },
        ]
        const workbook = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Grades')
        XLSX.writeFile(workbook, `${subjectCode} - ${descriptiveTitle}_${courseSection}_students_grades.xlsx`)
    }

    const uploadExcel = (e) => {
        const file = e.target.files[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = (event) => {
            const data = new Uint8Array(event.target.result)
            const workbook = XLSX.read(data, { type: 'array' })
            const sheetName = workbook.SheetNames[0]
            const worksheet = workbook.Sheets[sheetName]
            const uploadedData = XLSX.utils.sheet_to_json(worksheet)

            // Match and update grades
            const updatedGrades = grades.map((student) => {
                const match = uploadedData.find((row) => row['ID NUMBER'] === student.id_number)
                return match
                    ? {
                        ...student,
                        midterm_grade: !!schoolYear.allow_upload_midterm ? Number(match['MIDTERM']).toFixed(1) ?? '' : '',
                        final_grade: !!schoolYear.allow_upload_final ? Number(match['FINAL']).toFixed(1) ?? '' : '',
                    }
                    : student
            })
            setGrades(updatedGrades)

            if (!!schoolYear.allow_upload_midterm || !!schoolYear.allow_upload_final) {
                uploadToDatabase(
                    updatedGrades.map(({ name, ...rest }) => rest)
                )
            }

            // 🔥 Reset the input so it can be used again with the same file
            e.target.value = ''
        }

        reader.readAsArrayBuffer(file)
    }

    // Update your uploadToDatabase function:
    const uploadToDatabase = async (data) => {
        setUploadStatus('uploading')

        // Clear any existing timeout
        if (uploadStatusTimeoutRef.current) {
            clearTimeout(uploadStatusTimeoutRef.current)
        }

        try {
            const response = await axios.post(
                route('upload.students.grades', { yearSectionSubjectsId }),
                { data },
                { headers: { 'Content-Type': 'application/json' } }
            )

            await new Promise((resolve) => setTimeout(resolve, 2000)) // 2-second delay
            setUploadStatus('saved')
        } catch (error) {
            console.error('Upload failed:', error)
            setUploadStatus('idle')
        }
    }

    const timeoutRefs = useRef({}) // Store timeouts per student field

    // Update your handleGradeChange function to set uploading status:
    const handleGradeChange = (index, field, value) => {
        // Update local UI state
        handleChange(index, field, value)

        const student = grades[index]
        const studentId = student.id_number

        // Clear previous timeout
        const key = `${studentId}-${field}`
        if (timeoutRefs.current[key]) {
            clearTimeout(timeoutRefs.current[key])
        }

        // Set status to uploading
        setUploadStatus('uploading')

        // Clear any existing saved status timeout
        if (uploadStatusTimeoutRef.current) {
            clearTimeout(uploadStatusTimeoutRef.current)
        }

        // Set new timeout
        timeoutRefs.current[key] = setTimeout(() => {
            if (value !== '' && value !== null) {
                handleChange(index, field, Number(value).toFixed(1))
            }

            const routeName =
                field === 'midterm_grade'
                    ? 'student.midterm.grade'
                    : 'student.final.grade'

            axios.patch(route(routeName, { yearSectionSubjectsId, studentId }), {
                [field]: value === '' ? null : Number(value),
            })
                .then(() => setUploadStatus('saved'))
                .catch((err) => {
                    console.error('Update failed', err)
                    setUploadStatus('idle')
                })
        }, 1500)

    }

    const componentRef = useRef(null);

    const handlePrint = useReactToPrint({
        contentRef: componentRef,
    });

    useEffect(() => {
        const handleKeyPress = (event) => {
            if (event.key === 'p' || event.key === 'P') {
                handlePrint();
            }
        };

        window.addEventListener('keydown', handleKeyPress);

        return () => {
            window.removeEventListener('keydown', handleKeyPress);
        };
    }, [handlePrint]);

    // Add cleanup useEffect at the bottom of your component:
    useEffect(() => {
        return () => {
            if (uploadStatusTimeoutRef.current) {
                clearTimeout(uploadStatusTimeoutRef.current)
            }
            Object.values(timeoutRefs.current).forEach(timeout => {
                if (timeout) clearTimeout(timeout)
            })
        }
    }, [])

    const { data, isLoading, isError, error, refetch } = useGradeSubmission(yearSectionSubjectsId);
    const [submitting, setSubimitting] = useState(false);

    const handleSubmit = (type) => {
        if (!validateGradesBeforeSubmit(type)) return;
        setSubimitting(true)
        const routeName =
            type === "final"
                ? "grade-submission.submit-final-grade"
                : "grade-submission.submit-midterm-grade";

        router.post(
            route(routeName, yearSectionSubjectsId),
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success("Submitted successfully");
                },
                onError: (errors) => {
                    if (errors && errors.grades) {
                        toast({
                            title: "Submission failed",
                            description: errors.grades,
                            variant: "destructive",
                        });
                    } else {
                        toast.error("Failed to submit");
                    }
                },
                onFinish: async () => {
                    await refetch();
                    setSubimitting(false)
                },
            }
        );
    };

    const handleCancel = (type) => {
        setSubimitting(true)

        const routeName =
            type === "final"
                ? "grade-submission.cancel-final-grade"
                : "grade-submission.cancel-midterm-grade";

        router.post(
            route(routeName, yearSectionSubjectsId),
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success("Submitted successfully");
                },
                onError: (errors) => {
                    if (errors && errors.grades) {
                        toast({
                            title: "Submission failed",
                            description: errors.grades,
                            variant: "destructive",
                        });
                    } else {
                        toast.error("Failed to submit");
                    }
                },
                onFinish: async () => {
                    await refetch();
                    setSubimitting(false);
                }
            }
        );
    }

    const handleRequestEdit = (type) => {
        setSubimitting(true)

        const routeName =
            type === "final"
                ? "grades.request-edit.final-grade"
                : "grades.request-edit.midterm-grade";

        router.post(
            route(routeName, yearSectionSubjectsId),
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success("Request successfully sent");
                },
                onError: (errors) => {
                    if (errors && errors.grades) {
                        toast.success("Something went wrong");
                    } else {
                        toast.error("Failed to submit");
                    }
                },
                onFinish: async () => {
                    await getChangeRequests();
                    setSubimitting(false);
                }
            }
        );
    }


    const [midtermRequestStatus, setMidtermRequestStatus] = useState([]);
    const [finalRequestStatus, setFinalRequestStatus] = useState([]);

    const getChangeRequests = async () => {
        if (data.midterm_status != 'deployed' || data.final_status != 'deployed') return

        await axios.post(route('grades.edit-request-status', yearSectionSubjectsId))
            .then(response => {
                setMidtermRequestStatus(response.data.midtermRequestStatus);
                setFinalRequestStatus(response.data.finalRequestStatus);
            })
    }

    useEffect(() => {
        if (!data) return
        getChangeRequests();
    }, [data])

    const handleCancelRequestEdit = (type) => {
        setSubimitting(true)

        const routeName =
            type === "final"
                ? "grades.request-edit-cancel.final-grade"
                : "grades.request-edit-cancel.midterm-grade";
                
        const requestId = type == 'final' ? finalRequestStatus.id : midtermRequestStatus.id

        router.post(
            route(routeName, requestId),
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success("Request canceled");
                },
                onError: (errors) => {
                    if (errors && errors.grades) {
                        toast.success("Something went wrong");
                    } else {
                        toast.error("Failed to submit");
                    }
                },
                onFinish: async () => {
                    await getChangeRequests();
                    setSubimitting(false);
                }
            }
        );
    }

    return (
        <>
            <div className="relative p-4 overflow-auto space-y-4">
                <div className="flex justify-between items-center mb-4">
                    {/* <div className="flex items-center gap-4"> */}
                    {/* <GradeSubmissionStatus gradeStatus={gradeStatus} /> */}

                    {/* Upload Status Indicator - Shows uploading or saved */}
                    {/* {uploadStatus !== 'idle' && (
                            <div className="flex items-center gap-2 text-sm">
                                {uploadStatus === 'uploading' && (
                                    <>
                                        <CloudUpload className="w-8 h-8 text-blue-500 animate-pulse" />
                                        <span className="text-blue-600 text-2xl">Uploading...</span>
                                    </>
                                )}
                                {uploadStatus === 'saved' && (
                                    <>
                                        <Cloud className="w-8 h-8 text-green-500" />
                                        <span className="text-green-600 text-2xl">Saved</span>
                                    </>
                                )}
                            </div>
                        )} */}
                    {/* </div> */}

                    <div className="flex gap-2 self-end">
                        <Button
                            disabled={gradeStatus.is_submitted || gradeStatus.is_deployed}
                            variant="outline"
                            onClick={downloadExcel}
                        >
                            <Download className="w-4 h-4 mr-2" />
                            Download Template
                        </Button>

                        <Button
                            disabled={gradeStatus.is_submitted || gradeStatus.is_deployed}
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <Upload className="w-4 h-4 mr-2" />
                            Upload Students
                        </Button>

                        <Button
                            variant="outline"
                            onClick={handlePrint} // quick print
                        >
                            <Printer className="w-4 h-4 mr-2" />
                            Print
                        </Button>

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".xlsx, .xls"
                            onChange={uploadExcel}
                            className="hidden"
                        />
                    </div>
                </div>

                {/* <div className="bg-red-50 border border-red-200 text-red-700 rounded px-4 py-2 mb-4 text-sm">
                ⚠️ Once submitted, grades cannot yet be edited. Edit request functionality is still under development.
            </div> */}

                <div ref={componentRef} className='print:space-y-4 print:p-4'>
                    <GradeHeader subjectCode={subjectCode} descriptiveTitle={descriptiveTitle} courseSection={courseSection} schoolYear={schoolYear} />
                    {isLoading ? (
                        <div className='h-full'>
                            <PreLoader />
                        </div>
                    ) : (
                        <>
                            <GradesStudentList
                                grades={grades}
                                status={data}
                                missingFields={missingFields}
                                handleGradeChange={handleGradeChange}
                                setMissingFields={setMissingFields}
                                allowMidtermUpload={schoolYear.allow_upload_midterm}
                                allowFinalUpload={schoolYear.allow_upload_final}
                                yearSectionSubjectsId={yearSectionSubjectsId}
                            />
                        </>
                    )}
                    <GradeSignatories yearSectionSubjectsId={yearSectionSubjectsId} />
                </div>
            </div >

            <div className='h-24' />

            {/* OUTSIDE the scrollable container */}
            {!isLoading && (
                <div className='fixed bottom-0 z-50 flex gap-4 w-full max-w-6xl h-28 px-4'>
                    {/* Midterm (will appear on the right) */}
                    <Card className='rounded-none no-print w-96 mb-4'>
                        <CardHeader className='flex-row justify-between px-4 mt-2 space-y-0 items-center'>
                            {/* Rejection message for midterm */}
                            <p className='underline w-max'>Midterm grade</p>

                            <GradeRequestEditAction
                                gradeSubmissionStatus={data.midterm_status}
                                isDisabled={submitting}
                                handleRequestEdit={handleRequestEdit}
                                type='midterm'
                                requestStatus={midtermRequestStatus}
                                handleCancelRequestEdit={handleCancelRequestEdit}
                            />

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
                                <InstructorGradeSubmitionButton
                                    handleSubmit={handleSubmit}
                                    disabledButton={!schoolYear.allow_upload_midterm || submitting}
                                    handleCancel={handleCancel}
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
                        <CardHeader className='flex-row justify-between px-4 mt-2 space-y-0 items-center'>
                            {/* Rejection message for midterm */}
                            <p className='underline w-max'>Final grade</p>
                            
                            <GradeRequestEditAction
                                gradeSubmissionStatus={data.final_status}
                                isDisabled={submitting}
                                handleRequestEdit={handleRequestEdit}
                                type='final'
                                requestStatus={finalRequestStatus}
                                handleCancelRequestEdit={handleCancelRequestEdit}
                            />

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
                                <InstructorGradeSubmitionButton
                                    handleSubmit={handleSubmit}
                                    disabledButton={!schoolYear.allow_upload_final || submitting}
                                    handleCancel={handleCancel}
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
        </>
    )
}

export default Grades
