import { Card, CardContent, CardDescription, CardHeader } from '@/Components/ui/card'
import { Input } from '@/Components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table'
import React from 'react'

function GradesStudentList({ grades, gradeStatus, missingFields, handleGradeChange, setMissingFields }) {
    return (
        <Card>
            <CardHeader>
                <CardDescription className='text-red-500'>
                    Note: If the student iS DROPPED, enter 0.0. Do not leave it blank.
                </CardDescription>
            </CardHeader>
            <CardContent>
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
                        {grades.map((student, index) => (
                            <TableRow key={index}>
                                <TableCell className="text-center">{index + 1}.</TableCell>
                                <TableCell>{student.id_number}</TableCell>
                                <TableCell>{student.name}</TableCell>
                                <TableCell className="text-center">
                                    {((gradeStatus.is_submitted || gradeStatus.is_deployed) && !gradeStatus.is_rejected) ? (
                                        <>
                                            {student.midterm_grade}
                                        </>
                                    ) : (
                                        <Input
                                            min={1}
                                            max={5}
                                            type="number"
                                            className={`w-20 text-center h-6 [appearance:textfield]
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
                                    )}
                                </TableCell>
                                <TableCell className="text-center">
                                    {((gradeStatus.is_submitted || gradeStatus.is_deployed) && !gradeStatus.is_rejected) ? (
                                        <>
                                            {student.final_grade}
                                        </>
                                    ) : (
                                        <Input
                                            min={1}
                                            max={5}
                                            type="number"
                                            className={`w-20 text-center h-6 [appearance:textfield]
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
                                    )}
                                </TableCell>
                                <TableCell className="text-center">
                                    {student.midterm_grade === 0.0 || student.final_grade === 0.0 ? (
                                        <span className="text-red-500 font-medium">DROPPED</span>
                                    ) : student.midterm_grade && student.final_grade ? (
                                        ((+student.midterm_grade + +student.final_grade) / 2).toFixed(1)
                                    ) : (
                                        '-'
                                    )}
                                </TableCell>
                                <TableCell className="text-center">
                                    {student.midterm_grade === 0.0 || student.final_grade === 0.0 ? (
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
