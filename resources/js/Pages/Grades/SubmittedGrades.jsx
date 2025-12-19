import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import React, { useEffect, useState } from 'react';
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from '@/Components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Button } from '@/Components/ui/button';
import axios from 'axios';
import { Head } from '@inertiajs/react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table'
import SchoolYearPicker from '@/Components/SchoolYearPicker';
import { useSchoolYearStore } from '@/Components/useSchoolYearStore';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, BookOpen, Loader2 } from 'lucide-react';

export default function SubmittedGrades({ departmentId }) {
    const { selectedSchoolYearEntry } = useSchoolYearStore();

    const getFacultiesSubmittedGrades = async () => {
        const response = await axios.post(route('faculty-list.submitted-grades'), {
            schoolYearId: selectedSchoolYearEntry.id,
            departmentId: departmentId
        });
        return response.data;
    };

    const { data: facultyList = [], isLoading, isError } = useQuery({
        queryKey: ['faculty-subjects', selectedSchoolYearEntry?.id],
        queryFn: getFacultiesSubmittedGrades,
        enabled: !!selectedSchoolYearEntry?.id,
        staleTime: 1000 * 60 * 5,
    });

    return (
        <div className="space-y-4">
            <Head title='Submitted Grades' />
            <div className='flex gap-4'>

                <SchoolYearPicker />

                <Card className="w-full">
                    <CardHeader>
                        <CardTitle>Faculty List</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 mt-2">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                <Loader2 className="w-8 h-8 animate-spin mb-3" />
                                <p className="text-sm">Loading subjects...</p>
                            </div>
                        ) : isError ? (
                            <div className="flex flex-col items-center justify-center py-12 text-destructive">
                                <AlertCircle className="w-8 h-8 mb-3" />
                                <p className="text-sm font-medium">Failed to load faculties</p>
                                <p className="text-xs text-muted-foreground mt-1">Please try again later</p>
                            </div>
                        ) : facultyList.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                <BookOpen className="w-12 h-12 mb-3 opacity-30" />
                                <p className="text-sm font-medium">No subjects assigned</p>
                                <p className="text-xs mt-1">Check back later or contact administration</p>
                            </div>
                        ) : (
                            <div className="rounded-md border">
                                <div className="border rounded-md">
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-[40px] text-center">#</TableHead>
                                                    <TableHead className="w-[140px]">FACULTY ID</TableHead>
                                                    <TableHead>NAME</TableHead>
                                                    <TableHead className="text-right">ACTION</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                        </Table>
                                    </div>
                                    <div className=" max-h-[calc(100vh-12rem)] min-h-[calc(100vh-12rem)] overflow-y-auto">
                                        <Table>
                                            <TableBody>
                                                {facultyList.map((faculty, index) => (
                                                    <TableRow key={faculty.user_id_no}>
                                                        <TableCell className="text-center">{index + 1}.</TableCell>
                                                        <TableCell>{faculty.user_id_no}</TableCell>
                                                        <TableCell>{faculty.name}</TableCell>
                                                        <TableCell className="flex justify-end">
                                                            {selectedSchoolYearEntry?.id && (
                                                                <div className="relative">
                                                                    <a
                                                                        href={route('grades.faculty.subjects', {
                                                                            schoolYear: `${selectedSchoolYearEntry.start_year}-${selectedSchoolYearEntry.end_year}`,
                                                                            semester: selectedSchoolYearEntry.semester.semester_name,
                                                                            facultyId: faculty.user_id_no,
                                                                        })}
                                                                        className="relative inline-block"
                                                                    >
                                                                        <Button size="sm" className="h-7">Subjects</Button>
                                                                        {faculty.submitted_count > 0 && (
                                                                            <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                                                                                {faculty.submitted_count}
                                                                            </div>
                                                                        )}
                                                                    </a>
                                                                </div>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

SubmittedGrades.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
