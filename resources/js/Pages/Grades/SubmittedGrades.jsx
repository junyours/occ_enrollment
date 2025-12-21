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
import { Head, Link } from '@inertiajs/react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table'
import SchoolYearPicker from '@/Components/SchoolYearPicker';
import { useSchoolYearStore } from '@/Components/useSchoolYearStore';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, BookOpen, Loader2 } from 'lucide-react';

export default function SubmittedGrades({ departmentId }) {
    const { selectedSchoolYearEntry } = useSchoolYearStore();
    const [search, setSearch] = useState('');

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

    // Filter faculty list based on search
    const filteredFacultyList = facultyList.filter(faculty => {
        const term = search.toLowerCase();
        return (
            faculty.user_id_no.toLowerCase().includes(term) ||
            faculty.name?.toLowerCase().includes(term)
        );
    });

    return (
        <div className="space-y-4">
            <Head title='Submitted Grades' />
            <div className='flex flex-row gap-4'>
                <SchoolYearPicker layout='vertical'/>
                <Card className="w-full">
                    <CardHeader>
                        {/* <CardTitle className='text-xl'>Faculty List</CardTitle> */}
                    </CardHeader>
                    <CardContent className="space-y-2 mt-2">
                        {/* Search input */}
                        <div className="mb-2">
                            <input
                                type="text"
                                placeholder="Search faculty..."
                                className="w-full border rounded px-2 py-1"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>

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
                        ) : filteredFacultyList.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                <BookOpen className="w-12 h-12 mb-3 opacity-30" />
                                <p className="text-sm font-medium">No subjects found</p>
                            </div>
                        ) : (
                            <div className="rounded-md border">
                                <div className="border-1 rounded-md">
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-[40px] text-center">#</TableHead>
                                                    <TableHead className="w-[140px]">FACULTY ID</TableHead>
                                                    <TableHead className=''>NAME</TableHead>
                                                    <TableHead className='w-32 text-center'>SUBJECTS</TableHead>
                                                    <TableHead className='w-32'>VERIFIED</TableHead>
                                                    <TableHead className="w-32 text-right">ACTION</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                        </Table>
                                    </div>
                                    <div className=" max-h-[calc(100vh-14rem)] min-h-[calc(100vh-14rem)] overflow-y-auto">
                                        <Table>
                                            <TableBody>
                                                {filteredFacultyList.map((faculty, index) => (
                                                    <TableRow key={faculty.user_id_no}>
                                                        <TableCell className="w-[40px] text-center">{index + 1}.</TableCell>
                                                        <TableCell className='w-[140px]'>{faculty.user_id_no}</TableCell>
                                                        <TableCell className=''>{faculty.name}</TableCell>
                                                        <TableCell className='w-32 text-center'>{faculty.subjects_count}</TableCell>
                                                        <TableCell className='w-32 py-0'>
                                                            <div className='flex flex-col'>
                                                                <div>Midterm: {faculty.midterm_valid_count}</div>
                                                                <div>Final: {faculty.final_valid_count}</div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="w-32 text-right">
                                                            {selectedSchoolYearEntry?.id && (
                                                                <div className="relative">
                                                                    <Link
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
                                                                    </Link>
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
