import React, { useEffect, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { Button } from '@/Components/ui/button'
import { Download, FileDown, Printer, Upload, Cloud, CloudUpload } from 'lucide-react'
import axios from 'axios'
import InstructorSubmitButton from './GradePartials/InstructorSubmitButton'
import GradesStudentList from './GradePartials/GradesStudentList'
import { useToast } from "@/hooks/use-toast";
import { router, usePage } from '@inertiajs/react'
import GradeSubmissionStatus from './GradePartials/GradeSubmissionStatus'
import { Card, CardContent, CardHeader } from '@/Components/ui/card'
import { useReactToPrint } from 'react-to-print';
import AppLogo from '@/Components/AppLogo'
import GradeSignatories from './GradePartials/GradeSignatories'
import GradeHeader from './GradePartials/GradeHeader'

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
            midterm_grade: student.midterm_grade ? Number(student.midterm_grade).toFixed(1) : '',
            final_grade: student.final_grade ? Number(student.final_grade).toFixed(1) : '',
        }))
    )

    const [missingFields, setMissingFields] = useState({})

    // Upload status state: 'idle' | 'uploading' | 'saved'
    const [uploadStatus, setUploadStatus] = useState('saved')
    const uploadStatusTimeoutRef = useRef(null)

    const validateGradesBeforeSubmit = () => {
        const missing = {}

        grades.forEach((student, index) => {
            const missingMidterm = student.midterm_grade === '' || student.midterm_grade === null || student.midterm_grade === undefined
            const missingFinal = student.final_grade === '' || student.final_grade === null || student.final_grade === undefined

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
            if (value) {
                handleChange(index, field, Number(value).toFixed(1))
            }

            const routeName =
                field === 'midterm_grade'
                    ? 'student.midterm.grade'
                    : 'student.final.grade'

            axios
                .patch(route(routeName, {
                    yearSectionSubjectsId,
                    studentId,
                }), {
                    [field]: Number(value),
                })
                .then(() => {
                    setUploadStatus('saved')
                })
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

    return (
        <div className="p-4 overflow-auto space-y-4">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-4">
                    <GradeSubmissionStatus gradeStatus={gradeStatus} />

                    {/* Upload Status Indicator - Shows uploading or saved */}
                    {uploadStatus !== 'idle' && (
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
                    )}
                </div>

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

                <GradesStudentList
                    grades={grades}
                    gradeStatus={gradeStatus}
                    missingFields={missingFields}
                    handleGradeChange={handleGradeChange}
                    setMissingFields={setMissingFields}
                    allowMidtermUpload={schoolYear.allow_upload_midterm}
                    allowFinalUpload={schoolYear.allow_upload_final}
                />

                <div className='w-full flex items-end justify-end no-print mt-4'>
                    <InstructorSubmitButton
                        disabledButton={true}
                        gradeSubmission={gradeStatus}
                        onSubmit={async () => {
                            if (!validateGradesBeforeSubmit()) return

                            router.post(
                                route('grade-submission.submit', yearSectionSubjectsId),
                                {},
                                {
                                    preserveScroll: true,
                                    onSuccess: () => toast.success('Submitted successfully'),
                                    onError: (errors) => {
                                        if (errors && errors.grades) {
                                            toast({
                                                title: "Submission failed",
                                                description: errors.grades,
                                                variant: "destructive",
                                            })
                                        } else {
                                            toast.error('Failed to submit')
                                        }
                                    },
                                }
                            )
                        }}
                        cancel={async () => {
                            router.post(
                                route('grade-submission.cancel', yearSectionSubjectsId),
                                {},
                                {
                                    preserveScroll: true,
                                    onSuccess: () => {
                                        toast.success('Submission canceled');
                                    },
                                    onError: () => toast.error('Failed to cancel'),
                                }
                            )
                        }}
                    />
                </div>

                <GradeSignatories yearSectionSubjectsId={yearSectionSubjectsId} />
            </div>
        </div >
    )
}

export default Grades
