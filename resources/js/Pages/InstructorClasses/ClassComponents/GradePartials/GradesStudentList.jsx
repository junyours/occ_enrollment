import { Card, CardContent, CardDescription, CardHeader } from '@/Components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/Components/ui/tooltip'
import React from 'react'
import { computeFinalGrade } from '@/Pages/Grades/GradeUtility' 
import GradeInput from '../GradeInput'
import { cn } from '@/Lib/Utils'
import GradeRemarkBadge from '@/Components/GradeRemarkBadge'

function GradesStudentList({ grades, status, missingFields, handleGradeChange, setMissingFields, allowMidtermUpload, allowFinalUpload, yearSectionSubjectsId }) {
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
                       
                            return (
                                <TableRow key={index} className='p-0 print:p-0'>
                                    <TableCell className="text-center print:p-0.5">{index + 1}.</TableCell>
                                    <TableCell className='print:p-0.5'>{student.id_number}</TableCell>
                                    <TableCell className='print:p-0.5'>{student.name}</TableCell>
                                    <TableCell className="text-center print:p-0.5">
                                        {(status.midterm_status === 'submitted' || status.midterm_status === 'deployed' || status.midterm_status === 'verified') ? (
                                            <div>
                                                {student.midterm_grade}
                                            </div>
                                        ) : (
                                            <>
                                                {!allowMidtermUpload ? (
                                                    <div className="inline-block print:hidden">
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
                                                    </div>
                                                ) : (
                                                    <div className="inline-block print:hidden">
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
                                                            onValueChange={(value) => {
                                                                handleGradeChange(index, 'midterm_grade', value)

                                                                setMissingFields((prev) => {
                                                                    const updated = { ...prev }
                                                                    if (updated[index]) updated[index].midterm = false
                                                                    return updated
                                                                })
                                                            }}
                                                        />
                                                    </div>
                                                )}
                                                <div className='hidden print:block'>{student.midterm_grade}</div>
                                            </>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-center print:p-0.5">
                                        {(status.final_status == 'submitted' || status.final_status == 'deployed' || status.final_status == 'verified') ? (
                                            <>
                                                {student.final_grade}
                                            </>
                                        ) : (
                                            <>
                                                {!allowFinalUpload ? (
                                                    <div className="inline-block print:hidden">
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
                                                    </div>
                                                ) : (
                                                    <div className="inline-block print:hidden">
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
                                                            onValueChange={(value) => {
                                                                handleGradeChange(index, 'final_grade', value)

                                                                setMissingFields((prev) => {
                                                                    const updated = { ...prev }
                                                                    if (updated[index]) updated[index].final = false
                                                                    return updated
                                                                })
                                                            }}
                                                        />
                                                    </div>
                                                )}
                                                <div className='hidden print:block'>{student.final_grade}</div>
                                            </>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-center print:p-0.5">
                                        {finalGrade || '-'}
                                    </TableCell>
                                    <TableCell className="text-center print:p-0.5">
                                        <GradeRemarkBadge midterm={student.midterm_grade} final={student.final_grade} />
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
