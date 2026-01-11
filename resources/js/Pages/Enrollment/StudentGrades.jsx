import React, { useState, useMemo } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import axios from 'axios';

// Shadcn UI Components
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/Components/ui/card";
import { Input } from "@/Components/ui/input";
import { Button } from "@/Components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/Components/ui/table";
import { Badge } from "@/Components/ui/badge";
import { Loader2, Search, User, CalendarDays, X, GraduationCap, CheckCircle2, XCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/Components/ui/alert";
import { computeFinalGrade } from '../Grades/GradeUtility';
import { Separator } from '@/Components/ui/separator';

const semesterDisplayMap = {
    First: <div>1<sup>st</sup> Semester</div>,
    Second: <div>2<sup>nd</sup> Semester</div>,
    Summer: 'Summer Term',
}

export default function StudentGrades() {
    const [studentId, setStudentId] = useState('');
    const [studentData, setStudentData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isError, setIsError] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    const stats = useMemo(() => {
        if (!studentData?.enrollments) return null;

        let total = 0, passed = 0, failed = 0, dropped = 0;
        studentData.enrollments.forEach(enrollment => {
            enrollment.subjects?.forEach(item => {
                const grade = computeFinalGrade(item.midterm_grade, item.final_grade);
                total++;
                if (item.midterm_grade == 0.0 || item.final_grade == 0.0) dropped++;
                else if (grade && grade <= 3) passed++;
                else if (grade && grade > 3) failed++;
            });
        });
        return { total, passed, failed, dropped };
    }, [studentData]);

    const handleSearch = async (e) => {
        if (e) e.preventDefault();
        if (!studentId.trim()) return;

        setIsLoading(true);
        setIsError(false);
        setHasSearched(true);

        try {
            const response = await axios.post(route('enrollment.student-grades.search'), {
                id_no: studentId.trim()
            });
            setStudentData(response.data);
        } catch (error) {
            setIsError(true);
            setStudentData(null);
        } finally {
            setIsLoading(false);
        }
    };

    const handleReset = () => {
        setStudentId('');
        setStudentData(null);
        setHasSearched(false);
        setIsError(false);
    };

    return (
        <div className="container max-w-5xl space-y-4">

            {/* Header Section */}
            <div className="flex flex-col items-center text-center space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">Academic Records</h1>
            </div>

            {/* Search Section */}
            <Card className="shadow-sm">
                <CardContent className="pt-6">
                    <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Enter Student ID (e.g. 2024-1-01234, 01234)"
                                value={studentId}
                                onChange={(e) => setStudentId(e.target.value)}
                                className="pl-10 h-12"
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button
                                type="submit"
                                disabled={isLoading || !studentId}
                                className="h-12 px-6"
                            >
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                                Search
                            </Button>
                            {hasSearched && (
                                <Button type="button" variant="outline" onClick={handleReset} className="h-12 px-3">
                                    <X className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </form>
                </CardContent>
            </Card>

            {/* Content Area */}
            {isError ? (
                <Alert variant="destructive">
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>No results found for student ID: {studentId}</AlertDescription>
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
                                    <p className="text-xs font-medium uppercase opacity-70">Student Name</p>
                                    <h2 className="text-xl font-bold uppercase tracking-tight leading-none">
                                        {[studentData.information?.first_name, studentData.information?.last_name].join(' ')}
                                    </h2>
                                    <p className="text-sm opacity-80 mt-1 font-mono">{studentData.user_id_no}</p>
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

                    <div className="flex items-center gap-3 py-2">
                        <CalendarDays className="h-5 w-5 text-muted-foreground" />
                        <h3 className="text-lg font-semibold">Enrollment History</h3>
                        <Separator className="flex-1" />
                    </div>

                    {/* Semester Tables */}
                    <div className="space-y-8">
                        {studentData.enrollments?.map((enrollment) => (
                            <div key={enrollment.id} className="space-y-3">
                                <h4 className="font-bold text-sm text-muted-foreground flex items-center gap-2">
                                    {enrollment.year_section?.school_year?.start_year}–{enrollment.year_section?.school_year?.end_year}
                                    <span>•</span>
                                    {semesterDisplayMap[enrollment.year_section?.school_year?.semester?.semester_name]}
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
                                            {enrollment.subjects?.map((item) => {
                                                const grade = computeFinalGrade(item.midterm_grade, item.final_grade);
                                                const isDropped = item.midterm_grade == 0.0 || item.final_grade == 0.0;
                                                const isPassed = !isDropped && grade && grade <= 3;
                                                const isFailed = !isDropped && grade && grade > 3;

                                                return (
                                                    <TableRow key={item.id}>
                                                        <TableCell className="font-medium">
                                                            {item.year_section_subjects?.subject?.descriptive_title}
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