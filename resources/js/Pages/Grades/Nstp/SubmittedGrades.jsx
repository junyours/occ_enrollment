import { Card, CardContent } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { useSchoolYearStore } from '@/Components/useSchoolYearStore';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout'
import { Head, Link } from '@inertiajs/react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { AlertCircle, BookOpen, Loader2 } from 'lucide-react';
import React, { useState } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table'
import { formatName } from '@/Lib/InfoUtils';
import { Button } from '@/Components/ui/button';

export default function SubmittedGrades() {
    const { selectedSchoolYearEntry } = useSchoolYearStore();
    const [search, setSearch] = useState('');

    const getFacultiesSubmittedGrades = async () => {
        const response = await axios.post(route('nstp.faculty-list.submitted-grades'), {
            schoolYearId: selectedSchoolYearEntry.id,
        });
        return response.data;
    };

    const { data: facultyList = [], isLoading, isError } = useQuery({
        queryKey: ['faculty-subjects', selectedSchoolYearEntry?.id],
        queryFn: getFacultiesSubmittedGrades,
        enabled: !!selectedSchoolYearEntry?.id,
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
                <Card className="w-full pt-4">
                    <CardContent className="space-y-2 mt-2">
                        {/* Search input */}
                        <div className="mb-2">
                            <Input
                                type="text"
                                placeholder="Search faculty..."
                                className="w-full"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>

                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                <Loader2 className="w-8 h-8 animate-spin mb-3" />
                                <p className="text-sm">Loading faculties...</p>
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
                                <p className="text-sm font-medium">No faculties found</p>
                            </div>
                        ) : (
                            <div className="rounded-md border">
                                <div className="border-1 rounded-md">
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-10 text-center">#</TableHead>
                                                    <TableHead className="w-24">FACULTY ID</TableHead>
                                                    <TableHead className='w-48'>NAME</TableHead>
                                                    <TableHead className='w-28'>VERIFIED</TableHead>
                                                    <TableHead className='w-24 text-left'>SUBJECTS</TableHead>
                                                    <TableHead className="w-24 text-right">ACTION</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                        </Table>
                                    </div>
                                    <div className="max-h-[calc(100vh-14rem)] min-h-[calc(100vh-14rem)] overflow-y-auto">
                                        <Table>
                                            <TableBody>
                                                {filteredFacultyList.map((faculty, index) => (
                                                    <TableRow key={faculty.user_id_no}>
                                                        <TableCell className="w-10 text-center">{index + 1}.</TableCell>
                                                        <TableCell className='w-24'>{faculty.user_id_no}</TableCell>
                                                        <TableCell className='w-48'>{formatName(faculty, { format: 'LFM' })}</TableCell>
                                                        <TableCell className='w-28'>
                                                            <div className='flex flex-col gap-1 text-sm'>
                                                                <div className='flex items-center justify-between'>
                                                                    <span className='text-muted-foreground'>Midterm:</span>
                                                                    <span className={`font-medium ${faculty.midterm_verified_count === faculty.subjects_count
                                                                        ? 'text-emerald-600'
                                                                        : 'text-amber-500'
                                                                        }`}>
                                                                        {faculty.midterm_verified_count}
                                                                    </span>
                                                                </div>
                                                                <div className='border-b' />
                                                                <div className='flex items-center justify-between'>
                                                                    <span className='text-muted-foreground'>Final:</span>
                                                                    <span className={`font-medium ${faculty.final_verified_count === faculty.subjects_count
                                                                        ? 'text-emerald-600'
                                                                        : 'text-amber-500'
                                                                        }`}>
                                                                        {faculty.final_verified_count}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className='w-24 text-left text-2xl'>/{faculty.subjects_count}</TableCell>
                                                        <TableCell className="w-24 text-right">
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
    )
}

SubmittedGrades.layout = page => <AuthenticatedLayout children={page} />