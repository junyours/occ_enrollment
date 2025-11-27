import SchoolYearPicker from '@/Components/SchoolYearPicker';
import { Button } from '@/Components/ui/button';
import { Card, CardContent } from '@/Components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { useSchoolYearStore } from '@/Components/useSchoolYearStore';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Link } from '@inertiajs/react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import React from 'react';

export default function InstructorSubjectsList() {
    const { selectedSchoolYearEntry } = useSchoolYearStore();

    const fetchFacultySubjects = async () => {
        const response = await axios.post(route('instructor-subjects'), {
            schoolYearId: selectedSchoolYearEntry.id,
        });
        return response.data;
    };

    const { data: subjects = [], isLoading, isError } = useQuery({
        queryKey: ['faculty-subjects', selectedSchoolYearEntry?.id],
        queryFn: fetchFacultySubjects,
        enabled: !!selectedSchoolYearEntry?.id, // only runs when school year is selected
        staleTime: 1000 * 60 * 5, // 5 minutes cache
    });

    return (
        <div className='space-y-4'>
            <SchoolYearPicker />
            <Card>
                <CardContent className='p-2'>
                    {isLoading ? (
                        <p className="text-sm text-muted">Loading subjects...</p>
                    ) : isError ? (
                        <p className="text-sm text-red-500">Failed to load subjects.</p>
                    ) : subjects.length === 0 ? (
                        <p className="text-sm text-muted">No subjects found.</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Subject</TableHead>
                                    <TableHead>Section</TableHead>
                                    <TableHead className='text-right'>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {subjects.map((subject) => (
                                    <TableRow key={subject.id}>
                                        <TableCell>{subject.descriptive_title}</TableCell>
                                        <TableCell>
                                            {subject.course_name_abbreviation}-{subject.year_level_id}{subject.section}
                                        </TableCell>
                                        <TableCell className='text-right'>
                                            <Link href={`/subjects-list/${subject.hashed_year_section_subject_id}`}>
                                                <Button className="py-0 h-auto" variant="link">open</Button>
                                            </Link>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

InstructorSubjectsList.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
