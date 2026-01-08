import SchoolYearPicker from '@/Components/SchoolYearPicker';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { useSchoolYearStore } from '@/Components/useSchoolYearStore';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, Link } from '@inertiajs/react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, BookOpen, Loader2 } from 'lucide-react';
import React, { useEffect, useState } from 'react'

function VerifiedGrades() {
    const { selectedSchoolYearEntry } = useSchoolYearStore();

    const [search, setSearch] = useState('');

    const getFacultiesVerifiedGrades = async () => {
        const response = await axios.post(route('faculty-list.verified-grades'), {
            schoolYearId: selectedSchoolYearEntry.id,
        })
        return response.data;
    };

    const { data: facultyList = [], isLoading, isError } = useQuery({
        queryKey: ['faculty-subjects', selectedSchoolYearEntry?.id],
        queryFn: getFacultiesVerifiedGrades,
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
            <Head title='Verified Grades' />
            <div className='flex gap-4'>
                <SchoolYearPicker layout='vertical' />
                <Card className="w-full">
                    <CardHeader>
                        {/* <CardTitle>Faculty List</CardTitle> */}
                    </CardHeader>
                    <CardContent className="space-y-2 mt-2">
                        <div className="mb-2">
                            <Input
                                type="text"
                                placeholder="Search faculty..."
                                className=""
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
                            <div className="border rounded-md">
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-[40px] text-center">#</TableHead>
                                                <TableHead className="w-[140px]">FACULTY ID</TableHead>
                                                <TableHead className=''>NAME</TableHead>
                                                <TableHead className='w-32 text-center'>SUBJECTS</TableHead>
                                                <TableHead className='w-32'>DEPLOYED</TableHead>
                                                <TableHead className="w-32 text-right">ACTION</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                    </Table>
                                </div>
                                <div className="max-h-[calc(100vh-14rem)] min-h-[calc(100vh-14rem)] overflow-y-auto">
                                    <Table>
                                        <TableBody>
                                            {filteredFacultyList.map((faculty, index) => (
                                                <TableRow key={faculty.user_id_no}>
                                                    <TableCell className="w-[40px] text-center">{index + 1}.</TableCell>
                                                    <TableCell className='w-[140px]'>{faculty.user_id_no}</TableCell>
                                                    <TableCell>{faculty.name}</TableCell>
                                                    <TableCell className='w-32 text-center'>{faculty.subjects_count}</TableCell>
                                                    <TableCell className='w-32 py-0'>
                                                        <div className='flex flex-col'>
                                                            <div>Midterm: {faculty.midterm_deployed_count}</div>
                                                            <div>Final: {faculty.final_deployed_count}</div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="w-32 text-right">
                                                        <div className="relative">
                                                            <Link
                                                                href={route('verified.faculty.subjects', {
                                                                    schoolYear: `${selectedSchoolYearEntry.start_year}-${selectedSchoolYearEntry.end_year}`,
                                                                    semester: selectedSchoolYearEntry.semester.semester_name,
                                                                    facultyId: faculty.user_id_no
                                                                })}
                                                                className="relative inline-block"
                                                            >
                                                                <Button size="sm" className="h-7">Subjects</Button>
                                                                {faculty.verified_count > 0 && (
                                                                    <div className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                                                                        {faculty.verified_count}
                                                                    </div>
                                                                )}
                                                            </Link>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

export default VerifiedGrades
VerifiedGrades.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
