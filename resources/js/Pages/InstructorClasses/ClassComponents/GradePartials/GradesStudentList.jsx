import { Button } from '@/Components/ui/button'
import { Card, CardContent, CardDescription, CardHeader } from '@/Components/ui/card'
import { Input } from '@/Components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/Components/ui/tooltip'
import { useToast } from "@/hooks/use-toast";
import React from 'react'
import { useGradeSubmissionStore } from './useGradeSubmissionStore'
import { router } from '@inertiajs/react'

function GradesStudentList({ grades, status, missingFields, handleGradeChange, setMissingFields, allowMidtermUpload, allowFinalUpload, yearSectionSubjectsId }) {
    console.log(status);

    const { toast } = useToast();

    // Call the hook

    const { gradeSubmission, updateGradeSubmission } = useGradeSubmissionStore();

    const validateGradesBeforeSubmit = (type) => {
        const missing = {}

        grades.forEach((student, index) => {
            if (!student.is_dropped) {
                if (type === 'midterm' && !student.midterm_grade) {
                    missing[index] = { ...missing[index], midterm: true };
                }
                if (type === 'final' && !student.final_grade) {
                    missing[index] = { ...missing[index], final: true };
                }
            }
        });

        setMissingFields(missing)

        if (Object.keys(missing).length != 0) {
            toast({
                description: "Fill all grade fields.",
                variant: "destructive",
            })
        }

        return Object.keys(missing).length === 0
    }


    // Handle loading and error states
    // if (isLoading) return <p>Loading submission...</p>;
    // if (isError) return <p>Error: {error.message}</p>;

    return (
        <Card>
            <CardHeader>
                <CardDescription className='text-red-500 no-print'>
                    Note: If the student iS DROPPED, enter 0.0. Do not leave it blank.
                </CardDescription>
            </CardHeader>
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
                        {grades.map((student, index) => (
                            <TableRow key={index} className='print:p-0'>
                                <TableCell className="text-center print:p-0">{index + 1}.</TableCell>
                                <TableCell className='print:p-0'>{student.id_number}</TableCell>
                                <TableCell className='print:p-0'>{student.name}</TableCell>
                                <TableCell className="text-center print:p-0">
                                    {(status.midterm_status == 'submitted' || status.midterm_status == 'deployed') ? (
                                        <div>
                                            {student.midterm_grade}
                                        </div>
                                    ) : (
                                        <>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Input
                                                        disabled={!allowMidtermUpload}
                                                        min={1}
                                                        max={5}
                                                        type="number"
                                                        className={`w-20 text-center h-6 [appearance:textfield] print:w-10 no-print
                                                                [&::-webkit-inner-spin-button]:appearance-none
                                                                [&::-webkit-outer-spin-button]:appearance-none
                                                                ${missingFields[index]?.midterm ? 'border-red-500' : ''}`}
                                                        value={student.midterm_grade}
                                                        onChange={(e) => {
                                                            const raw = parseFloat(e.target.value)
                                                            const clamped = Math.max(0, Math.min(5, raw))
                                                            const rounded = Math.round(clamped * 10) / 10

                                                            handleGradeChange(index, 'midterm_grade', isNaN(raw) ? '' : rounded)

                                                            // Clear validation error on change
                                                            setMissingFields((prev) => {
                                                                const updated = { ...prev }
                                                                if (updated[index]) updated[index].midterm = false
                                                                return updated
                                                            })
                                                        }}
                                                    />
                                                </TooltipTrigger>
                                                {!allowMidtermUpload && (
                                                    <TooltipContent>Not allowed to upload grades</TooltipContent>
                                                )}
                                            </Tooltip>
                                            <div className='hidden print:block'>{student.midterm_grade}</div>
                                        </>
                                    )}
                                </TableCell>
                                <TableCell className="text-center print:p-0">
                                    {(status.final_status == 'submitted' || status.final_status == 'deployed') ? (
                                        <>
                                            {student.final_grade}
                                        </>
                                    ) : (
                                        <>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Input
                                                        disabled={!allowFinalUpload}
                                                        min={1}
                                                        max={5}
                                                        type="number"
                                                        className={`w-20 text-center h-6 [appearance:textfield] print:w-10 no-print
                                                                [&::-webkit-inner-spin-button]:appearance-none
                                                                [&::-webkit-outer-spin-button]:appearance-none
                                                                ${missingFields[index]?.final ? 'border-red-500' : ''}`}
                                                        value={student.final_grade}
                                                        onChange={(e) => {
                                                            const raw = parseFloat(e.target.value)
                                                            const clamped = Math.max(0, Math.min(5, raw))
                                                            const rounded = Math.round(clamped * 10) / 10

                                                            handleGradeChange(index, 'final_grade', isNaN(raw) ? '' : rounded)

                                                            // Clear validation error on change
                                                            setMissingFields((prev) => {
                                                                const updated = { ...prev }
                                                                if (updated[index]) updated[index].final = false
                                                                return updated
                                                            })
                                                        }}
                                                    />
                                                </TooltipTrigger>
                                                {!allowFinalUpload && (
                                                    <TooltipContent>Not allowed to upload grades</TooltipContent>
                                                )}
                                            </Tooltip>
                                            <div className='hidden print:block'>{student.final_grade}</div>
                                        </>
                                    )}
                                </TableCell>
                                <TableCell className="text-center print:p-0">
                                    {student.midterm_grade == "0.0" || student.final_grade == "0.0" ? (
                                        <span className="text-red-500 font-medium">DROPPED</span>
                                    ) : student.midterm_grade && student.final_grade ? (
                                        (() => {
                                            const avg = (+student.midterm_grade + +student.final_grade) / 2;
                                            const finalRating = avg >= 3.05 ? 5.0 : +avg;
                                            return <div className={`${(Number(student.midterm_grade) + Number(student.final_grade)) / 2 >= 3.05
                                                ? 'text-red-500'
                                                : ''
                                                }`}>{(Math.round(finalRating * 10) / 10).toFixed(1)}</div>;
                                        })()
                                    ) : (
                                        '-'
                                    )}
                                </TableCell>
                                <TableCell className="text-center print:p-0">
                                    {student.midterm_grade == "0.0" || student.final_grade == "0.0" ? (
                                        <span className="text-red-500 font-medium">DROPPED</span>
                                    ) : student.midterm_grade && student.final_grade ? (
                                        (Number(student.midterm_grade) + Number(student.final_grade)) / 2 >= 3.05 ? (
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
    )
}

export default GradesStudentList
