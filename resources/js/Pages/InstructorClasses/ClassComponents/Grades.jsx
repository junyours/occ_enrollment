import React, { useEffect, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { Button } from '@/Components/ui/button'
import {
    Download,
    Printer,
    Upload,
    Cloud,
    CloudUpload,
    AlertCircle,
    ChevronUp,
    ChevronDown,
    FileText,
    Send,
    CheckCircle,
    XCircle,
    Rocket,
} from 'lucide-react'
import axios from 'axios'
import GradesStudentList from './GradePartials/GradesStudentList'
import { router, usePage } from '@inertiajs/react'
import { useReactToPrint } from 'react-to-print'
import GradeSignatories from './GradePartials/GradeSignatories'
import GradeHeader from './GradePartials/GradeHeader'
import { useGradeSubmission } from './GradePartials/useGradeSubmission'
import PreLoader from '@/Components/preloader/PreLoader'
import InstructorGradeSubmitionButton from './GradePartials/InstructorGradeSubmitionButton'
import GradeRequestEditAction from './GradePartials/GradeRequestEditAction'
import { toast } from 'sonner'

/* -------------------------------------------------------------------------- */
/*  Status config                                                              */
/* -------------------------------------------------------------------------- */

// Order of the submission pipeline. "rejected" is a detour that sits at the
// "submitted" step, so it reuses that position with a red fill.
const STEPS = ['draft', 'submitted', 'verified', 'deployed']

const statusMap = {
    draft: {
        label: 'Draft',
        text: 'text-gray-500 dark:text-gray-400',
        bar: 'bg-gray-400',
        icon: FileText,
        step: 0,
    },
    submitted: {
        label: 'Submitted',
        text: 'text-blue-600 dark:text-blue-400',
        bar: 'bg-blue-500',
        icon: Send,
        step: 1,
    },
    verified: {
        label: 'Verified',
        text: 'text-green-600 dark:text-green-400',
        bar: 'bg-green-600',
        icon: CheckCircle,
        step: 2,
    },
    rejected: {
        label: 'Rejected',
        text: 'text-red-600 dark:text-red-400',
        bar: 'bg-red-500',
        icon: XCircle,
        step: 1,
    },
    deployed: {
        label: 'Deployed',
        text: 'text-indigo-600 dark:text-indigo-400',
        bar: 'bg-indigo-600',
        icon: Rocket,
        step: 3,
    },
}

const saveStateMap = {
    uploading: {
        icon: CloudUpload,
        label: 'Saving…',
        className: 'text-blue-600 dark:text-blue-400',
        pulse: true,
    },
    saved: {
        icon: Cloud,
        label: 'All changes saved',
        className: 'text-green-600 dark:text-green-400',
        pulse: false,
    },
    idle: {
        icon: AlertCircle,
        label: 'Save failed',
        className: 'text-red-600 dark:text-red-400',
        pulse: false,
    },
}

/* -------------------------------------------------------------------------- */
/*  Small presentational components                                            */
/* -------------------------------------------------------------------------- */

function SaveIndicator({ status }) {
    const state = saveStateMap[status] || saveStateMap.saved
    const Icon = state.icon

    return (
        <div
            className={`flex items-center gap-2 text-sm font-medium ${state.className}`}
            aria-live="polite"
        >
            <Icon className={`h-4 w-4 ${state.pulse ? 'animate-pulse' : ''}`} />
            <span>{state.label}</span>
        </div>
    )
}

function StatusTrack({ label }) {
    const status = label?.toLowerCase?.()
    const config = statusMap[status]
    const Icon = config?.icon

    return (
        <div
            className="min-w-0 flex-1"
            role="group"
            aria-label={`Status: ${config?.label ?? 'Not started'}`}
        >
            <div
                className={`mb-1.5 flex items-center gap-1.5 text-xs font-semibold ${config?.text ?? 'text-muted-foreground'}`}
            >
                {Icon && <Icon size={14} />}
                <span>{config?.label ?? '—'}</span>
            </div>

            <div className="flex gap-1">
                {STEPS.map((step, index) => (
                    <span
                        key={step}
                        title={step.charAt(0).toUpperCase() + step.slice(1)}
                        className={`h-1.5 flex-1 rounded-full transition-colors ${config && index <= config.step ? config.bar : 'bg-muted'
                            }`}
                    />
                ))}
            </div>
        </div>
    )
}

function SubmissionPanel({
    type,
    title,
    data,
    canUpload,
    submitting,
    onSubmit,
    onCancel,
    onRequestEdit,
    onCancelRequestEdit,
    requestStatus,
    reasonOpen,
    onToggleReason,
}) {
    const status = data[`${type}_status`]
    const rejectionMessage = data[`${type}_rejection_message`]
    const showReason = status == 'rejected' && rejectionMessage

    return (
        <div className="rounded-xl border bg-card p-3">
            <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">{title}</h3>

                <div className="flex items-center gap-3">
                    {showReason && (
                        <div className="relative">
                            <button
                                type="button"
                                onClick={onToggleReason}
                                aria-expanded={reasonOpen}
                                className="flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                            >
                                <AlertCircle className="h-3 w-3" />
                                View reason
                                {reasonOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
                            </button>

                            {reasonOpen && (
                                <div className="absolute bottom-full right-0 z-50 mb-2 w-64 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-900 shadow-lg dark:border-red-900 dark:bg-red-950 dark:text-red-100">
                                    {rejectionMessage}
                                </div>
                            )}
                        </div>
                    )}

                    <GradeRequestEditAction
                        gradeSubmissionStatus={status}
                        isDisabled={submitting === type}
                        handleRequestEdit={onRequestEdit}
                        type={type}
                        requestStatus={requestStatus}
                        handleCancelRequestEdit={onCancelRequestEdit}
                    />
                </div>
            </div>

            <div className="flex items-center gap-3">
                <StatusTrack label={status} />

                <InstructorGradeSubmitionButton
                    handleSubmit={onSubmit}
                    disabledButton={!canUpload || submitting === type}
                    handleCancel={onCancel}
                    type={type}
                    status={{
                        deployed_at: data[`${type}_deployed_at`],
                        rejection_message: rejectionMessage,
                        status,
                        submitted_at: data[`${type}_submitted_at`],
                        verified_at: data[`${type}_verified_at`],
                    }}
                />
            </div>
        </div>
    )
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const isValidGrade = (grade) => {
    if (grade === undefined || grade === null || grade === '') return false;
    const num = Number(grade);
    return !isNaN(num) && num >= 1 && num <= 5;
};

/* -------------------------------------------------------------------------- */
/*  Main component                                                             */
/* -------------------------------------------------------------------------- */

function Grades({
    students,
    subjectCode,
    descriptiveTitle,
    courseSection,
    yearSectionSubjectsId,
    gradeStatus,
    getClassStudents,
    schoolYear }) {

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
            toast.error("Please fill all grade fields before submitting.")
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

            const allowMidtermUpload = schoolYear.allow_upload_midterm;
            const allowFinalUpload = schoolYear.allow_upload_final;

            let invalidEntriesCount = 0;

            const updatedGrades = grades.map((student) => {
                const match = uploadedData.find((row) => row['ID NUMBER'] === student.id_number);

                if (!match) return student;

                let updatedStudent = { ...student };

                if (allowMidtermUpload) {
                    const midGrade = match['MIDTERM'];
                    if (midGrade !== undefined && midGrade !== null && midGrade !== '') {
                        if (isValidGrade(midGrade)) {
                            updatedStudent.midterm_grade = Number(midGrade).toFixed(1);
                        } else {
                            invalidEntriesCount++;
                        }
                    }
                }

                if (allowFinalUpload) {
                    const finGrade = match['FINAL'];
                    if (finGrade !== undefined && finGrade !== null && finGrade !== '') {
                        if (isValidGrade(finGrade)) {
                            updatedStudent.final_grade = Number(finGrade).toFixed(1);
                        } else {
                            invalidEntriesCount++;
                        }
                    }
                }

                return updatedStudent;
            });

            if (invalidEntriesCount > 0) {
                toast.error(`${invalidEntriesCount} invalid grade(s) were skipped. Grades must be a number between 1 and 5.`);
            } else {
                toast.success('Grades applied successfully!');
            }

            if (!!schoolYear.allow_upload_midterm || !!schoolYear.allow_upload_final) {
                uploadToDatabase(
                    updatedGrades.map(({ name, ...rest }) => rest)
                )
            }

            setGrades(updatedGrades);

            e.target.value = ''
        }

        reader.readAsArrayBuffer(file)
    }

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
        } finally {
            getClassStudents()
        }
    }

    const timeoutRefs = useRef({}) // Store timeouts per student field

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

    // Cleanup timers on unmount
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
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = (type) => {
        if (!validateGradesBeforeSubmit(type)) return;
        setSubmitting(type)
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
                    setSubmitting(false)
                },
            }
        );
    };

    const handleCancel = (type) => {
        setSubmitting(type)

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
                    toast.warning("Submission canceled");
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
                    setSubmitting(false);
                }
            }
        );
    }

    const handleRequestEdit = (type) => {
        setSubmitting(type)

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
                    setSubmitting(false);
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
        setSubmitting(type)

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
                    setSubmitting(false);
                }
            }
        );
    }

    const toggleReason = (type) =>
        setExpandedRejection((prev) => ({ ...prev, [type]: !prev[type] }))

    return (
        <>
            <div className="relative space-y-4 overflow-auto pb-4">
                {/* Toolbar: save state on the left, actions on the right */}
                <div className="no-print flex flex-wrap items-center justify-between gap-3 print:hidden">
                    <SaveIndicator status={uploadStatus} />

                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            disabled={gradeStatus.is_submitted || gradeStatus.is_deployed}
                            variant="outline"
                            onClick={downloadExcel}
                        >
                            <Download className="mr-2 h-4 w-4" />
                            Download Template
                        </Button>

                        <Button
                            disabled={gradeStatus.is_submitted || gradeStatus.is_deployed}
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <Upload className="mr-2 h-4 w-4" />
                            Upload Students
                        </Button>

                        <span className="mx-1 hidden h-6 w-px bg-border sm:block" aria-hidden />

                        <Button variant="outline" onClick={handlePrint}>
                            <Printer className="mr-2 h-4 w-4" />
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

                {/* Grade sheet: framed on screen, flat on paper */}
                <div
                    ref={componentRef}
                    className='print:space-y-4 print:p-4'
                >
                    <GradeHeader
                        subjectCode={subjectCode}
                        descriptiveTitle={descriptiveTitle}
                        courseSection={courseSection}
                        schoolYear={schoolYear}
                    />

                    {isLoading ? (
                        <div className="grid h-full min-h-[240px] place-items-center">
                            <PreLoader />
                        </div>
                    ) : (
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
                    )}

                    <GradeSignatories yearSectionSubjectsId={yearSectionSubjectsId} />
                </div>
            </div>

            {/* Spacer so the fixed dock never covers the signatories (desktop only) */}
            <div className="hidden h-36 md:block" />

            {/* Submission dock: fixed on desktop, flows under the sheet on mobile */}
            {!isLoading && (
                <div className="no-print z-50 w-full px-4 pb-4 print:hidden md:fixed md:bottom-0 md:max-w-6xl">
                    <div className="grid gap-2 rounded-2xl border bg-background/90 p-2 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/75 md:grid-cols-2">
                        <SubmissionPanel
                            type="midterm"
                            title="Midterm grade"
                            data={data}
                            canUpload={schoolYear.allow_upload_midterm}
                            submitting={submitting}
                            onSubmit={handleSubmit}
                            onCancel={handleCancel}
                            onRequestEdit={handleRequestEdit}
                            onCancelRequestEdit={handleCancelRequestEdit}
                            requestStatus={midtermRequestStatus}
                            reasonOpen={expandedRejection.midterm}
                            onToggleReason={() => toggleReason('midterm')}
                        />

                        <SubmissionPanel
                            type="final"
                            title="Final grade"
                            data={data}
                            canUpload={schoolYear.allow_upload_final}
                            submitting={submitting}
                            onSubmit={handleSubmit}
                            onCancel={handleCancel}
                            onRequestEdit={handleRequestEdit}
                            onCancelRequestEdit={handleCancelRequestEdit}
                            requestStatus={finalRequestStatus}
                            reasonOpen={expandedRejection.final}
                            onToggleReason={() => toggleReason('final')}
                        />
                    </div>
                </div>
            )}
        </>
    )
}

export default Grades