import { Dialog, DialogContent } from '@/Components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/Components/ui/table"
import { Badge } from "@/Components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/Components/ui/alert"
import { useQuery } from '@tanstack/react-query'
import { Loader2, Search, CheckCircle2, XCircle, User } from 'lucide-react'
import axios from 'axios'
import React, { useMemo } from 'react'
import { computeFinalGrade } from '@/Pages/Grades/GradeUtility'
import { Card, CardContent } from '@/Components/ui/card'

const semesterDisplayMap = {
    First: <div>1<sup>st</sup> Semester</div>,
    Second: <div>2<sup>nd</sup> Semester</div>,
    Summer: 'Summer Term',
}

export default function StudentGrades({ studentId, open, setOpen }) {

    const fetchStudentGrades = async () => {
        const response = await axios.post(route('student-grades'), { student_id: studentId });
        return response.data; // This is the sorted array we built
    }

    const { data, isLoading, isError } = useQuery({
        queryKey: ['student-grades', studentId],
        queryFn: fetchStudentGrades,
        enabled: !!studentId && open,
    });

    const stats = useMemo(() => {
        if (!data?.records) return null;

        let total = 0, passed = 0, failed = 0, dropped = 0;
        data?.records.forEach(enrollment => {
            enrollment.subjects?.forEach(item => {
                const grade = computeFinalGrade(item.midterm_grade, item.final_grade);
                total++;
                if (item.midterm_grade == 0.0 || item.final_grade == 0.0) dropped++;
                else if (grade && grade <= 3) passed++;
                else if (grade && grade > 3) failed++;
            });
        });
        return { total, passed, failed, dropped };
    }, [data?.records]);

    return (
        <Dialog open={open} onOpenChange={setOpen} className="ourline-none">
            <DialogContent className="sm:max-w-[800px] max-h-[95vh] overflow-y-auto">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-10">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground mt-2">Loading grades...</p>
                    </div>
                ) : isError ? (
                    <Alert variant="destructive">
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>Failed to fetch grades. Please try again.</AlertDescription>
                    </Alert>
                ) : data?.records && data?.records.length > 0 ? (
                    <div>
                        <div className='w-full flex gap-4'>
                            <Card className="md:col-span-2 bg-primary text-primary-foreground w-full">
                                <CardContent className="p-6 flex items-center gap-4">
                                    <div className="h-14 w-14 rounded-full bg-primary-foreground/10 flex items-center justify-center">
                                        <User className="h-7 w-7" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold uppercase tracking-tight leading-none">
                                            {[data?.student?.first_name, data?.student?.last_name].join(' ')}
                                        </h2>
                                        <p className="text-sm opacity-80 mt-1 font-mono">{data?.student?.user_id_no}</p>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card className="bg-muted/50">
                                <CardContent className="px-6 py-4 flex flex-col items-center justify-center text-center">
                                    <CheckCircle2 className="h-5 w-5 text-primary mb-1" />
                                    <span className="text-2xl font-bold">{stats.passed}</span>
                                    <p className="text-xs text-muted-foreground uppercase font-semibold">Passed</p>
                                </CardContent>
                            </Card>

                            <Card className="bg-muted/50">
                                <CardContent className="px-6 py-4 flex flex-col items-center justify-center text-center">
                                    <XCircle className="h-5 w-5 text-destructive mb-1" />
                                    <span className="text-2xl font-bold">{stats.failed}</span>
                                    <p className="text-xs text-muted-foreground uppercase font-semibold">Failed</p>
                                </CardContent>
                            </Card>
                        </div>

                        <Card className="py-2 pl-2 mt-4">
                            <div className='h-full max-h-[calc(100vh-17rem)] min-h-[calc(100vh-17rem)] overflow-y-auto space-y-8 pr-1'>
                                {data?.records.map((enrollment, index) => (
                                    <div key={index} className="space-y-1">
                                        <div className="flex items-center gap-3">
                                            <h4 className="font-bold text-sm text-primary flex items-center gap-2">
                                                {enrollment.start_year} – {enrollment.end_year}
                                                <span className="text-muted-foreground">•</span>
                                                {/* {enrollment.semester_name} Semester */}
                                                {semesterDisplayMap[enrollment.semester_name]}
                                            </h4>
                                            <div className="flex-1 border-b border-dashed" />
                                        </div>

                                        <div className="rounded-md border bg-card">
                                            <Table>
                                                <TableHeader className="bg-muted/50">
                                                    <TableRow>
                                                        <TableHead className='w-96'>Subject</TableHead>
                                                        <TableHead className="text-center">Grade</TableHead>
                                                        <TableHead className="text-right">Status</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {enrollment.subjects.map((sub, subIdx) => {
                                                        const grade = computeFinalGrade(sub.midterm_grade, sub.final_grade);
                                                        const isDropped = sub.midterm_grade == 0.0 || sub.final_grade == 0.0;
                                                        const isPassed = !isDropped && grade && grade <= 3;
                                                        const isFailed = !isDropped && grade && grade > 3;

                                                        return (
                                                            <TableRow key={subIdx}>
                                                                <TableCell className="font-medium text-sm">
                                                                    {sub.descriptive_title}
                                                                </TableCell>
                                                                <TableCell className="text-center font-bold">
                                                                    {grade || "-"}
                                                                </TableCell>
                                                                <TableCell className="text-right">
                                                                    {isDropped ? (
                                                                        <Badge variant="outline">Dropped</Badge>
                                                                    ) : isPassed ? (
                                                                        <Badge variant="default">Passed</Badge>
                                                                    ) : isFailed ? (
                                                                        <Badge variant="destructive">Failed</Badge>
                                                                    ) : (
                                                                        <span className="text-muted-foreground text-xs">-</span>
                                                                    )}
                                                                </TableCell>
                                                            </TableRow>
                                                        );
                                                    })}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground/50">
                        <Search className="h-12 w-12 mb-4" />
                        <p>No grade records found for this student.</p>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}