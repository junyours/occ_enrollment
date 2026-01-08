import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import axios from 'axios';

// Shadcn UI Components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/Components/ui/card";
import { Input } from "@/Components/ui/input";
import { Button } from "@/Components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/Components/ui/table";
import { Badge } from "@/Components/ui/badge";
import { Loader2, Search, RotateCcw, User, GraduationCap, Mail, Phone, CalendarDays, BookOpen, Award } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/Components/ui/alert";
import { Item } from '@radix-ui/react-accordion';
import { PageTitle } from '@/Components/ui/PageTitle';
import { computeFinalGrade } from '../Grades/GradeUtility';

export default function StudentGrades() {
    const [studentId, setStudentId] = useState('');
    const [studentData, setStudentData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isError, setIsError] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

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

    const getFormattedName = (info) => {
        if (!info) return "N/A";
        return [info.first_name, info.middle_name, info.last_name, info.suffix]
            .filter(Boolean)
            .join(' ');
    };

    const calculateStats = (enrollments) => {
        let totalSubjects = 0;
        let passedSubjects = 0;
        let failedSubjects = 0;
        let droppedSubjects = 0;

        enrollments?.forEach(enrollment => {
            enrollment.subjects?.forEach(item => {
                totalSubjects++;
                if (item.midterm_grade == 0.0 || item.final_grade == 0.0) {
                    droppedSubjects++;
                } else if (item.midterm_grade && item.final_grade) {
                    if (computeFinalGrade(item.midterm_grade, item.final_grade) > 3) {
                        failedSubjects++;
                    } else {
                        passedSubjects++;
                    }
                }
            });
        });

        return { totalSubjects, passedSubjects, failedSubjects, droppedSubjects };
    };

    return (
        <div className="">
            <div className="px-4 sm:px-6 lg:px-8 py-8">
                <div className="max-w-6xl mx-auto space-y-4">
                    {/* Header Section */}
                    <div className="text-center space-y-2">
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Student Grade Lookup</h1>
                        {/* <p className="text-slate-600 max-w-md mx-auto">Search for student records by entering their ID number below</p> */}
                    </div>

                    {/* Search Section */}
                    <Card className=" border-slate-200/60 backdrop-blur-sm bg-white/80">
                        <CardContent className="pt-6">
                            <form onSubmit={handleSearch}>
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                                        <Input
                                            placeholder="Enter Student ID Number (e.g., 2021-00001)"
                                            value={studentId}
                                            onChange={(e) => setStudentId(e.target.value)}
                                            className="pl-10 h-12 border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                                        />
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            type="submit"
                                            disabled={isLoading || !studentId}
                                            className="h-12 px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 transition-all"
                                        >
                                            {isLoading ? (
                                                <>
                                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                                    Searching...
                                                </>
                                            ) : (
                                                <>
                                                    <Search className="mr-2 h-5 w-5" />
                                                    Search
                                                </>
                                            )}
                                        </Button>
                                        {hasSearched && (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={handleReset}
                                                className="h-12 px-4 border-slate-300 hover:bg-slate-50"
                                            >
                                                <RotateCcw className="h-5 w-5" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    {isError && (
                        <Alert variant="destructive" className="bg-red-50 border-red-300  animate-in fade-in slide-in-from-top-2 duration-300">
                            <AlertTitle className="font-bold text-red-900">Record Not Found</AlertTitle>
                            <AlertDescription className="text-red-700">
                                No results found for ID: <span className="font-semibold">{studentId}</span>. Please verify the number and try again.
                            </AlertDescription>
                        </Alert>
                    )}

                    {studentData && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* Student Profile Card */}
                            <Card className="border-none  bg-gradient-to-br from-white to-slate-50/50 overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-500/5 to-transparent rounded-full -translate-y-32 translate-x-32" />
                                <CardContent className="p-4 relative">
                                    <div className="flex items-start gap-6">
                                        <div className="flex-shrink-0">
                                            <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl  flex items-center justify-center">
                                                <User className="h-10 w-10 text-white" />
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none">Student</Badge>
                                            </div>
                                            <h2 className="text-2xl font-bold text-slate-900 mb-1 uppercase tracking-wide">
                                                {getFormattedName(studentData.information)}
                                            </h2>
                                            <p className="text-slate-600 font-medium">ID: {studentId}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Statistics Overview
                            {studentData.enrollments && studentData.enrollments.length > 0 && (() => {
                                const stats = calculateStats(studentData.enrollments);
                                return (
                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                        <Card className="border-slate-200 shadow-md bg-white hover:shadow-lg transition-shadow">
                                            <CardContent className="p-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                                        <BookOpen className="h-6 w-6 text-blue-600" />
                                                    </div>
                                                    <div>
                                                        <p className="text-2xl font-bold text-slate-900">{stats.totalSubjects}</p>
                                                        <p className="text-sm text-slate-600 font-medium">Total Subjects</p>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                        <Card className="border-slate-200 shadow-md bg-white hover:shadow-lg transition-shadow">
                                            <CardContent className="p-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                                        <Award className="h-6 w-6 text-green-600" />
                                                    </div>
                                                    <div>
                                                        <p className="text-2xl font-bold text-slate-900">{stats.passedSubjects}</p>
                                                        <p className="text-sm text-slate-600 font-medium">Passed</p>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                        <Card className="border-slate-200 shadow-md bg-white hover:shadow-lg transition-shadow">
                                            <CardContent className="p-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                                        <span className="text-xl font-bold text-red-600">✕</span>
                                                    </div>
                                                    <div>
                                                        <p className="text-2xl font-bold text-slate-900">{stats.failedSubjects}</p>
                                                        <p className="text-sm text-slate-600 font-medium">Failed</p>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                        <Card className="border-slate-200 shadow-md bg-white hover:shadow-lg transition-shadow">
                                            <CardContent className="p-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                                                        <span className="text-xl font-bold text-amber-600">⊘</span>
                                                    </div>
                                                    <div>
                                                        <p className="text-2xl font-bold text-slate-900">{stats.droppedSubjects}</p>
                                                        <p className="text-sm text-slate-600 font-medium">Dropped</p>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>
                                );
                            })()} */}

                            {/* Enrollment History */}
                            <div className="space-y-5">
                                <div className="flex items-center gap-3 px-1">
                                    <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center ">
                                        <CalendarDays className="h-5 w-5 text-white" />
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-900">Enrollment History</h3>
                                </div>

                                {studentData.enrollments?.map((enrollment, index) => (
                                    <Card key={enrollment.id} className="border-slate-200  overflow-hidden hover: transition-shadow">
                                        <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50/50 border-b border-slate-200 py-5">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                <div className="space-y-1">
                                                    <CardTitle className="text-lg font-bold text-slate-800">
                                                        School Year {enrollment.year_section?.school_year?.start_year}–{enrollment.year_section?.school_year?.end_year}
                                                    </CardTitle>
                                                    <CardDescription className="text-slate-600">
                                                        {enrollment.year_section?.school_year?.semester?.semester_name} Semester
                                                    </CardDescription>
                                                </div>
                                                <Badge className="w-fit bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 border-none px-4 py-1.5 shadow-md">
                                                    Semester {index + 1}
                                                </Badge>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="p-0">
                                            <div className="overflow-x-auto">
                                                <Table>
                                                    <TableHeader className="bg-slate-50">
                                                        <TableRow className="hover:bg-slate-50">
                                                            <TableHead className="font-bold text-slate-700">Subject</TableHead>
                                                            <TableHead className="font-bold text-slate-700 text-center">Final Grade</TableHead>
                                                            <TableHead className="font-bold text-slate-700 text-center">Remarks</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {enrollment.subjects?.map((item) => {
                                                            const finalGrade = computeFinalGrade(item.midterm_grade, item.final_grade);
                                                            const isDropped = item.midterm_grade == 0.0 || item.final_grade == 0.0;
                                                            const isPassed = !isDropped && item.midterm_grade && item.final_grade && finalGrade <= 3;
                                                            const isFailed = !isDropped && item.midterm_grade && item.final_grade && finalGrade > 3;

                                                            return (
                                                                <TableRow key={item.id} className="hover:bg-slate-50/50 transition-colors">
                                                                    <TableCell className="font-medium text-slate-900">
                                                                        {item.year_section_subjects?.subject?.descriptive_title}
                                                                    </TableCell>
                                                                    <TableCell className="text-center">
                                                                        <span className="inline-flex items-center justify-center min-w-[3rem] px-3 py-1 rounded-lg bg-slate-100 font-bold text-slate-900">
                                                                            {finalGrade || '-'}
                                                                        </span>
                                                                    </TableCell>
                                                                    <TableCell className="text-center">
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
                                                            );
                                                        })}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

StudentGrades.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;