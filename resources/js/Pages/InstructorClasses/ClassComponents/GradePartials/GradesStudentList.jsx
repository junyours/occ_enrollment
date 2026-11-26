import { Card, CardContent, CardHeader } from '@/Components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/Components/ui/tooltip'
import React from 'react'
import { Info } from 'lucide-react'
import { computeFinalGrade } from '@/Pages/Grades/GradeUtility'
import GradeInput from '../GradeInput'
import { cn } from '@/Lib/Utils'
import GradeRemarkBadge from '@/Components/GradeRemarkBadge'
import './grades.css'

// Statuses where a period's grades are handed in and show as plain text.
const HANDED_IN = ['submitted', 'verified', 'deployed']

const EMPTY = 'No students are enrolled in this class yet.'

// One student's grade for a period: plain text once handed in, a locked box
// that says why on hover while entry is closed, otherwise a box to type in.
// On paper it's always the plain grade.
function GradeCell({ student, index, period, status, allowed, lockReason, missing, onChange }) {
    const field = `${period}_grade`
    const value = student[field]

    if (HANDED_IN.includes(status)) {
        return <span className="tabular-nums">{value || '—'}</span>
    }

    const box = (
        <GradeInput
            value={value}
            field={field}
            index={index}
            disabled={!allowed}
            aria-label={`${period === 'final' ? 'Final' : 'Midterm'} grade for ${student.name}`}
            className={cn(
                'h-9 w-20 text-center text-sm tabular-nums',
                missing && 'border-red-500 bg-red-500/10 dark:bg-red-500/20',
            )}
            onValueChange={allowed ? (next) => onChange(index, field, next) : undefined}
        />
    )

    return (
        <>
            {/* Inline, so the table's centred cells centre it. */}
            <span className="inline-block align-middle print:hidden">
                {allowed ? box : (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            {/* A disabled box can't show a tooltip itself. */}
                            <span className="inline-block">{box}</span>
                        </TooltipTrigger>
                        <TooltipContent>{lockReason}</TooltipContent>
                    </Tooltip>
                )}
            </span>
            <span className="hidden tabular-nums print:inline">{value}</span>
        </>
    )
}

function GradesStudentList({
    grades,
    status,
    missingFields,
    handleGradeChange,
    setMissingFields,
    allowMidtermUpload,
    allowFinalUpload,
    midtermLock,
    finalLock,
}) {
    // Typing in a box clears its "missing" mark.
    const change = (index, field, value) => {
        handleGradeChange(index, field, value)

        const period = field === 'midterm_grade' ? 'midterm' : 'final'
        setMissingFields((prev) => (
            prev[index]?.[period] ? { ...prev, [index]: { ...prev[index], [period]: false } } : prev
        ))
    }

    const cell = (student, index, period) => (
        <GradeCell
            student={student}
            index={index}
            period={period}
            status={status[`${period}_status`]}
            allowed={period === 'final' ? allowFinalUpload : allowMidtermUpload}
            lockReason={period === 'final' ? finalLock : midtermLock}
            missing={missingFields[index]?.[period]}
            onChange={change}
        />
    )

    return (
        <Card>
            <CardHeader className="pb-3 print:hidden">
                <p className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                    <span>
                        Dropped students get 0.0; don’t leave anyone blank. Press Enter to go
                        to the next student.
                    </span>
                </p>
            </CardHeader>
            <CardContent>
                {/* The table on wider screens and on paper. */}
                <div className="hidden md:block print:block" data-grade-list>
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
                            {grades.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">{EMPTY}</TableCell>
                                </TableRow>
                            ) : grades.map((student, index) => (
                                <TableRow key={`${student.id_number}-${index}`} className='p-0 transition-colors print:p-0'>
                                    <TableCell className="text-center print:p-0.5">{index + 1}.</TableCell>
                                    <TableCell className='print:p-0.5'>{student.id_number}</TableCell>
                                    <TableCell className='print:p-0.5'>{student.name}</TableCell>
                                    <TableCell className="py-1.5 text-center print:p-0.5">{cell(student, index, 'midterm')}</TableCell>
                                    <TableCell className="py-1.5 text-center print:p-0.5">{cell(student, index, 'final')}</TableCell>
                                    <TableCell className="text-center print:p-0.5">
                                        {computeFinalGrade(student.midterm_grade, student.final_grade) || '-'}
                                    </TableCell>
                                    <TableCell className="text-center print:p-0.5">
                                        <GradeRemarkBadge midterm={student.midterm_grade} final={student.final_grade} />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                {/* One card per student on phones, where seven columns don't fit. */}
                <ul className="divide-y md:hidden print:hidden" data-grade-list>
                    {grades.length === 0 ? (
                        <li className="py-8 text-center text-sm text-muted-foreground">{EMPTY}</li>
                    ) : grades.map((student, index) => (
                        <li key={`${student.id_number}-${index}`} className="-mx-3 space-y-2 px-3 py-3 transition-colors">
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-sm font-medium">{index + 1}. {student.name}</p>
                                    <p className="text-xs text-muted-foreground">{student.id_number}</p>
                                </div>
                                <GradeRemarkBadge midterm={student.midterm_grade} final={student.final_grade} />
                            </div>
                            {/* Every value a box's height, so the labels line up. */}
                            <div className="grid grid-cols-3 gap-2">
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground">Midterm</p>
                                    <div className="flex h-9 items-center text-sm">{cell(student, index, 'midterm')}</div>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground">Final</p>
                                    <div className="flex h-9 items-center text-sm">{cell(student, index, 'final')}</div>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground">Rating</p>
                                    <p className="flex h-9 items-center text-sm font-medium tabular-nums">
                                        {computeFinalGrade(student.midterm_grade, student.final_grade) || '—'}
                                    </p>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
    )
}

export default GradesStudentList
