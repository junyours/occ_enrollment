import React, { useEffect, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { Button } from '@/Components/ui/button'
import { Download, Printer, Upload, Cloud, CloudUpload, AlertCircle } from 'lucide-react'
import axios from 'axios'
import GradesStudentList from './GradePartials/GradesStudentList'
import { router, usePage } from '@inertiajs/react'
import { useReactToPrint } from 'react-to-print'
import GradeSignatories from './GradePartials/GradeSignatories'
import GradeHeader from './GradePartials/GradeHeader'
import { useGradeSubmission } from './GradePartials/useGradeSubmission'
import PreLoader from '@/Components/preloader/PreLoader'
import { lockedReason, uploadWindowText } from './GradePartials/UploadWindow'
import { ConfirmGradeAction, gradeConfirmText, statusMap, SubmissionBar, SubmissionPanel } from './GradePartials/SubmissionBar'
import { buildGradeTemplate, TEMPLATE_WRITE_OPTIONS } from './GradePartials/gradeTemplate'
import { toast } from 'sonner'

/* -------------------------------------------------------------------------- */
/*  Status config                                                              */
/* -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                    */
/* -------------------------------------------------------------------------- */

// The server's reason for a refused action, if it gave one.
const reason = (errors) => Object.values(errors ?? {}).flat()[0] ?? 'Please try again.'

// 0.0 for a dropped student, or 1.0–5.0, as in the grade boxes.
const isValidGrade = (grade) => {
    if (grade === undefined || grade === null || grade === '') return false;
    const num = Number(grade);
    return !isNaN(num) && (num === 0 || (num >= 1 && num <= 5));
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

    // Whether Import grades will take a period's column, for the template.
    const importNote = (type) => {
        const status = data?.[`${type}_status`]
        const upload = schoolYear.grade_upload?.[type]
        const allowed = type === 'final' ? schoolYear.allow_upload_final : schoolYear.allow_upload_midterm

        if (allowed) return ['Will be imported.', uploadWindowText(upload, status)].filter(Boolean).join(' ')
        if (['submitted', 'verified', 'deployed'].includes(status)) {
            return `${statusMap[status].label}: this column won’t be imported.`
        }

        return `${lockedReason(type, upload)} This column won’t be imported.`
    }

    // The current grades, one decimal, with an instructions sheet.
    const downloadExcel = () => {
        const workbook = buildGradeTemplate({
            grades,
            subject: `${subjectCode} - ${descriptiveTitle}`,
            section: courseSection,
            notes: { midterm: importNote('midterm'), final: importNote('final') },
        })
        XLSX.writeFile(workbook, `${subjectCode} - ${descriptiveTitle}_${courseSection}_students_grades.xlsx`, TEMPLATE_WRITE_OPTIONS)
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
                toast.error(`${invalidEntriesCount} invalid grade(s) were skipped. Grades must be 1.0 to 5.0, or 0.0 for dropped.`);
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
            toast.error(error.response?.data?.message ?? 'Couldn’t upload the grades. Please try again.')
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
                    // e.g. grade upload closed since the page loaded
                    toast.error(err.response?.data?.message ?? 'Couldn’t save this grade. Please try again.')
                })
        }, 1500)
    }

    const componentRef = useRef(null);

    // Print button only. (A bare "P" anywhere on the tab used to open the
    // print dialog, even while typing in a grade box.)
    const handlePrint = useReactToPrint({
        contentRef: componentRef,
    });

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
                    toast.error("Couldn’t submit the grades", { description: reason(errors) });
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
                    toast.error("Couldn’t unsubmit the grades", { description: reason(errors) });
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
                    toast.error("Couldn’t send the edit request", { description: reason(errors) });
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
        if (data.midterm_status != 'deployed' && data.final_status != 'deployed') return

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
                    toast.error("Couldn’t cancel the edit request", { description: reason(errors) });
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

    // The server decides per period (schoolYear.allow_upload_*), from the
    // registrar's dates and whether the grades were handed in.
    const canImport = Boolean(schoolYear.allow_upload_midterm || schoolYear.allow_upload_final)

    // Submit, Unsubmit and Cancel request each ask first: { action, type }.
    const [confirm, setConfirm] = useState(null)

    function askSubmit(type) {
        // Missing grades are pointed out first; nothing to confirm yet.
        if (validateGradesBeforeSubmit(type)) setConfirm({ action: 'submit', type })
    }

    const askUnsubmit = (type) => setConfirm({ action: 'unsubmit', type })
    const askCancelRequest = (type) => setConfirm({ action: 'cancel-request', type })

    function runConfirmed() {
        const { action, type } = confirm
        setConfirm(null)

        if (action === 'submit') handleSubmit(type)
        else if (action === 'unsubmit') handleCancel(type)
        else handleCancelRequestEdit(type)
    }

    const confirmText = gradeConfirmText({
        confirm,
        grades,
        upload: confirm && schoolYear.grade_upload?.[confirm.type],
        status: confirm && data?.[`${confirm.type}_status`],
        reviewer: 'program head',
    })

    return (
        <>
            {/* grades-panel: lets the submission bar stick (grades.css). */}
            <div className="grades-panel relative space-y-4 overflow-auto pb-4">
                {/* Toolbar: save state on the left, actions on the right */}
                <div className="no-print flex flex-wrap items-center justify-between gap-3 print:hidden">
                    <SaveIndicator status={uploadStatus} />

                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            variant="outline"
                            onClick={downloadExcel}
                        >
                            <Download className="mr-2 h-4 w-4" />
                            Download template
                        </Button>

                        {/* Importing only fills a period that can still be
                            edited: open and not yet submitted, or sent back. */}
                        <Button
                            disabled={!canImport}
                            title={canImport ? undefined : 'Neither period’s grades can be changed right now.'}
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <Upload className="mr-2 h-4 w-4" />
                            Import grades
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
                            midtermLock={lockedReason('midterm', schoolYear.grade_upload?.midterm)}
                            finalLock={lockedReason('final', schoolYear.grade_upload?.final)}
                            yearSectionSubjectsId={yearSectionSubjectsId}
                        />
                    )}

                    <GradeSignatories yearSectionSubjectsId={yearSectionSubjectsId} />
                </div>
            </div>

            {/* Submission bar: part of the page, so never wider than it. On
                wider screens it sticks to the bottom of the window while the
                sheet scrolls; on phones it follows the sheet. */}
            {!isLoading && (
                <SubmissionBar>
                        <SubmissionPanel
                            type="midterm"
                            title="Midterm grade"
                            data={data}
                            canUpload={schoolYear.allow_upload_midterm}
                            upload={schoolYear.grade_upload?.midterm}
                            submitting={submitting}
                            onSubmit={askSubmit}
                            onCancel={askUnsubmit}
                            onRequestEdit={handleRequestEdit}
                            onCancelRequestEdit={askCancelRequest}
                            requestStatus={midtermRequestStatus}
                            reasonOpen={expandedRejection.midterm}
                            onToggleReason={() => toggleReason('midterm')}
                        />

                        <SubmissionPanel
                            type="final"
                            title="Final grade"
                            data={data}
                            canUpload={schoolYear.allow_upload_final}
                            upload={schoolYear.grade_upload?.final}
                            submitting={submitting}
                            onSubmit={askSubmit}
                            onCancel={askUnsubmit}
                            onRequestEdit={handleRequestEdit}
                            onCancelRequestEdit={askCancelRequest}
                            requestStatus={finalRequestStatus}
                            reasonOpen={expandedRejection.final}
                            onToggleReason={() => toggleReason('final')}
                        />
                </SubmissionBar>
            )}

            <ConfirmGradeAction
                text={confirmText}
                onClose={() => setConfirm(null)}
                onConfirm={runConfirmed}
            />
        </>
    )
}

export default Grades
