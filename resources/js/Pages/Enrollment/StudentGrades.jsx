import React, { useState, useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import axios from 'axios';

// Shadcn UI Components
import { Card, CardContent } from "@/Components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/Components/ui/table";
import { Badge } from "@/Components/ui/badge";
import { Loader2, Search, User, CalendarDays, CheckCircle2, XCircle, BookOpen } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/Components/ui/alert";
import { Separator } from '@/Components/ui/separator';
import StudentSearch from '@/Components/StudentSearch';
import { useQuery } from '@tanstack/react-query';
import { formatName } from '@/Lib/InfoUtils';
import CopyButton from '@/Components/ui/CopyButton';

const semesterDisplayMap = {
    First: <div>1<sup>st</sup> Semester</div>,
    Second: <div>2<sup>nd</sup> Semester</div>,
    Summer: 'Summer Term',
}

export default function StudentGrades() {
    const [student, setStudent] = useState('');
    const [searchSubject, setSearchSubject] = useState('');

    const handleSearch = async () => {
        try {
            const response = await axios.post(route('enrollment.student-grades.search'), {
                id_no: student.user_id_no
            });
            return response.data.records;
        } catch (error) {
            console.log(error?.response?.data?.message || 'error')
        }
    };

    const { data: studentData, isLoading, isError } = useQuery({
        queryFn: handleSearch,
        queryKey: ['student-grades-evaluation', student?.user_id_no],
        enabled: !!student
    })

    const stats = useMemo(() => {
        if (!studentData) return null;

        let total = 0;
        let passed = 0;
        let failed = 0;
        let inProgress = 0;

        studentData.forEach((enrollment) => {
            enrollment.subjects?.forEach((subject) => {
                total++;
                const grade = subject.grade != null ? Number(subject.grade) : null;

                if (grade === null) {
                    inProgress++;
                } else if (grade <= 3) {
                    passed++;
                } else {
                    failed++;
                }
            });
        });

        return { total, passed, failed, inProgress };
    }, [studentData]);

    // NEW: Filter semesters based on the searched subject
    const filteredStudentData = useMemo(() => {
        if (!studentData) return null;
        if (!searchSubject.trim()) return studentData;

        const query = searchSubject.toLowerCase();

        return studentData.filter(enrollment => {
            // Only keep this enrollment block if at least one subject matches the query
            return enrollment.subjects?.some(subject =>
                subject.descriptive_title?.toLowerCase().includes(query) ||
                subject.subject_code?.toLowerCase().includes(query)
            );
        });
    }, [studentData, searchSubject]);

    return (
        <div className="container space-y-4">
            {/* Header Section */}
            <div className="flex flex-col items-center text-center space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">Academic Records</h1>
            </div>

            {/* Search Section */}
            <StudentSearch onSelect={(data) => setStudent(data)} className='w-full max-w-md' />

            {/* Content Area */}
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Loader2 className="w-8 h-8 animate-spin mb-3" />
                    <p className="text-sm">Loading requests...</p>
                </div>
            ) : (!studentData || !student) ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <BookOpen className="w-12 h-12 mb-3 opacity-30" />
                    <p className="text-sm font-medium">No Student</p>
                    <p className="text-xs mt-1">You may search a student above</p>
                </div>
            ) : isError ? (
                <Alert variant="destructive">
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>No results found for student ID: {student.user_id_no}</AlertDescription>
                </Alert>
            ) : studentData ? (
                <div className="space-y-6 animate-in fade-in duration-500">

                    {/* Profile & Quick Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card className="md:col-span-2 bg-primary text-primary-foreground">
                            <CardContent className="p-6 flex items-center gap-4">
                                <div className="h-14 w-14 rounded-full bg-primary-foreground/10 flex items-center justify-center">
                                    <User className="h-7 w-7" />
                                </div>
                                <div>
                                    <p className="text-xs font-medium uppercase opacity-70">Student</p>
                                    <h2 className="text-xl font-bold uppercase tracking-tight leading-none">
                                        {formatName(student)}
                                    </h2>
                                    <p className="text-sm opacity-80 mt-1 font-mono flex items-center justify-left">
                                        <span>{student.user_id_no}</span>
                                        <CopyButton className='text-white' text={student.user_id_no} size='xs' />
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="bg-muted/50">
                            <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                                <CheckCircle2 className="h-5 w-5 text-primary mb-1" />
                                <span className="text-2xl font-bold">{stats.passed}</span>
                                <p className="text-xs text-muted-foreground uppercase font-semibold">Passed</p>
                            </CardContent>
                        </Card>

                        <Card className="bg-muted/50">
                            <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                                <XCircle className="h-5 w-5 text-destructive mb-1" />
                                <span className="text-2xl font-bold">{stats.failed}</span>
                                <p className="text-xs text-muted-foreground uppercase font-semibold">Failed</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* History Header & Subject Search */}
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 py-2">
                        <div className="flex items-center gap-3">
                            <CalendarDays className="h-5 w-5 text-muted-foreground" />
                            <h3 className="text-lg font-semibold">Enrollment History</h3>
                        </div>

                        <div className="relative w-full md:w-72">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search & filter subjects..."
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-9 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                value={searchSubject}
                                onChange={(e) => setSearchSubject(e.target.value)}
                            />
                        </div>
                    </div>
                    <Separator />

                    {/* Semester Tables */}
                    <div className="space-y-4">
                        {filteredStudentData && filteredStudentData.length > 0 ? (
                            filteredStudentData.map((enrollment, index) => (
                                <Card>
                                    <CardContent className='pt-6'>
                                        <div key={`${enrollment.schoolyear}-${enrollment.semester}-${index}`} className="space-y-3">
                                            <h4 className="font-bold text-sm text-muted-foreground flex items-center gap-2">
                                                {enrollment.schoolyear}
                                                <span>•</span>
                                                {semesterDisplayMap[enrollment.semester]}
                                            </h4>

                                            <div className="rounded-md border">
                                                <Table>
                                                    <TableHeader className="bg-muted/50">
                                                        <TableRow>
                                                            <TableHead>Subject</TableHead>
                                                            <TableHead className="text-center w-32">Final Grade</TableHead>
                                                            <TableHead className="text-right w-32">Remarks</TableHead>
                                                        </TableRow>
                                                    </TableHeader>

                                                    <TableBody>
                                                        {enrollment.subjects?.map((subject) => {
                                                            const grade = subject.grade ? Number(subject.grade) : null;
                                                            const isPassed = grade !== null && grade <= 3;
                                                            const isFailed = grade !== null && grade > 3;

                                                            const isHighlighted = searchSubject.trim() !== '' &&
                                                                (subject.descriptive_title?.toLowerCase().includes(searchSubject.toLowerCase()) ||
                                                                    subject.subject_code?.toLowerCase().includes(searchSubject.toLowerCase()));

                                                            return (
                                                                <TableRow
                                                                    key={subject.subject_code}
                                                                    className={isHighlighted ? "bg-primary/15 transition-colors duration-300" : ""}
                                                                >
                                                                    <TableCell className="font-medium">
                                                                        {subject.descriptive_title}
                                                                        <span className="block text-xs text-muted-foreground font-normal">
                                                                            {subject.subject_code}
                                                                        </span>
                                                                    </TableCell>

                                                                    <TableCell className="text-center font-bold">
                                                                        {subject.grade ?? "-"}
                                                                    </TableCell>

                                                                    <TableCell className="text-right">
                                                                        {grade === null ? (
                                                                            <span className="text-muted-foreground text-xs">
                                                                                In Progress
                                                                            </span>
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
                                    </CardContent>
                                </Card>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                                <Search className="h-8 w-8 mb-2 opacity-20" />
                                <p className="text-sm">No subjects match "{searchSubject}"</p>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                /* Empty State */
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground/50">
                    <Search className="h-12 w-12 mb-4" />
                    <p>Enter a student ID to retrieve academic records</p>
                </div>
            )}
        </div>
    );
}

StudentGrades.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;