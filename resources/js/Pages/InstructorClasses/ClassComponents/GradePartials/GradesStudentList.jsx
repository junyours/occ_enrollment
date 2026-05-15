import { Button } from '@/Components/ui/button'
import { Card, CardContent, CardDescription, CardHeader } from '@/Components/ui/card'
import { Input } from '@/Components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/Components/ui/tooltip'
import { useToast } from "@/hooks/use-toast";
import React from 'react'
import { useGradeSubmissionStore } from './useGradeSubmissionStore'
import { Badge } from '@/Components/ui/badge'
import { computeFinalGrade } from '@/Pages/Grades/GradeUtility'
import GradeInput from '../GradeInput'
import { cn } from '@/Lib/Utils'

function GradesStudentList({ grades, status, missingFields, handleGradeChange, setMissingFields, allowMidtermUpload, allowFinalUpload, yearSectionSubjectsId }) {
    console.log(grades)
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
                        {grades.map((student, index) => {
                            const finalGrade = computeFinalGrade(student.midterm_grade, student.final_grade);
                            const isDropped = student.midterm_grade === 0.0 || student.midterm_grade === 0 || student.midterm_grade === "0.0" || student.midterm_grade === '0' || student.final_grade === 0.0;
                            const isPassed = !isDropped && student.midterm_grade && student.final_grade && finalGrade <= 3;
                            const isFailed = !isDropped && student.midterm_grade && student.final_grade && finalGrade > 3;
                            return (
                                <TableRow key={index} className='p-0 print:p-0'>
                                    <TableCell className="text-center print:p-0">{index + 1}.</TableCell>
                                    <TableCell className='print:p-0'>{student.id_number}</TableCell>
                                    <TableCell className='print:p-0'>{student.name}</TableCell>
                                    <TableCell className="text-center print:p-0">
                                        {(status.midterm_status === 'submitted' || status.midterm_status === 'deployed' || status.midterm_status === 'verified') ? (
                                            <div>
                                                {student.midterm_grade}
                                            </div>
                                        ) : (
                                            <>
                                                {!allowMidtermUpload ? (
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <div className="inline-block">
                                                                <GradeInput
                                                                    value={student.midterm_grade}
                                                                    className={cn(
                                                                        "w-16 text-center h-6 py-0 print:w-10 no-print rounded-none border-t-0 border-x-0 border-b border-gray-400 shadow-none",
                                                                        "focus:border-b-2 focus:outline-none focus-visible:ring-0 duration-200 ease-in-out",
                                                                        missingFields[index]?.midterm ? 'border-red-500' : ''
                                                                    )}
                                                                    disabled
                                                                />
                                                            </div>
                                                        </TooltipTrigger>
                                                        <TooltipContent>Not allowed to upload grades</TooltipContent>
                                                    </Tooltip>
                                                ) : (
                                                    <GradeInput
                                                        className={cn(
                                                            "w-16 text-center h-6 py-0 print:w-10 no-print rounded-none border-t-0 border-x-0 border-b border-gray-400 shadow-none",
                                                            "focus:border-b-2 focus:outline-none focus-visible:ring-0 duration-200 ease-in-out",
                                                            missingFields[index]?.midterm ? 'border-red-500' : ''
                                                        )}
                                                        disabled={!allowMidtermUpload}
                                                        min={1}
                                                        max={5}
                                                        value={student.midterm_grade}
                                                        index={index}
                                                        field="midterm_grade"
                                                        onValueChange={(returnedIndex, returnedField, value) => {
                                                            handleGradeChange(returnedIndex, returnedField, value)

                                                            setMissingFields((prev) => {
                                                                const updated = { ...prev }
                                                                if (updated[returnedIndex]) updated[returnedIndex].midterm = false
                                                                return updated
                                                            })
                                                        }}
                                                    />
                                                )}
                                                <div className='hidden print:block'>{student.midterm_grade}</div>
                                            </>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-center print:p-0">
                                        {(status.final_status == 'submitted' || status.final_status == 'deployed' || status.final_status == 'verified') ? (
                                            <>
                                                {student.final_grade}
                                            </>
                                        ) : (
                                            <>
                                                {!allowFinalUpload ? (
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <div className="inline-block">
                                                                <GradeInput
                                                                    value={student.final_grade}
                                                                    className={cn(
                                                                        "w-16 text-center h-6 py-0 print:w-10 no-print rounded-none border-t-0 border-x-0 border-b border-gray-400 shadow-none",
                                                                        "focus:border-b-2 focus:outline-none focus-visible:ring-0 duration-200 ease-in-out",
                                                                        missingFields[index]?.final ? 'border-red-500' : ''
                                                                    )}
                                                                    disabled
                                                                />
                                                            </div>
                                                        </TooltipTrigger>

                                                        <TooltipContent>
                                                            Not allowed to upload grades
                                                        </TooltipContent>
                                                    </Tooltip>
                                                ) : (
                                                    <GradeInput
                                                        className={cn(
                                                            "w-16 text-center h-6 py-0 print:w-10 no-print rounded-none border-t-0 border-x-0 border-b border-gray-400 shadow-none",
                                                            "focus:border-b-2 focus:outline-none focus-visible:ring-0 duration-200 ease-in-out",
                                                            missingFields[index]?.final ? 'border-red-500' : ''
                                                        )}
                                                        disabled={!allowFinalUpload}
                                                        min={1}
                                                        max={5}
                                                        value={student.final_grade}
                                                        index={index}
                                                        field="final_grade"
                                                        onValueChange={(returnedIndex, returnedField, value) => {
                                                            handleGradeChange(returnedIndex, returnedField, value)

                                                            setMissingFields((prev) => {
                                                                const updated = { ...prev }
                                                                if (updated[returnedIndex]) updated[returnedIndex].final = false
                                                                return updated
                                                            })
                                                        }}
                                                    />
                                                )}
                                                <div className='hidden print:block'>{student.final_grade}</div>
                                            </>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-center print:p-0">
                                        {finalGrade || '-'}
                                    </TableCell>
                                    <TableCell className="text-center print:p-0">
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
            </CardContent>
        </Card>
    )
}

export default GradesStudentList
