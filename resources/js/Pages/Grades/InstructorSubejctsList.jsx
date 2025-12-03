import SchoolYearPicker from '@/Components/SchoolYearPicker';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { useSchoolYearStore } from '@/Components/useSchoolYearStore';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Link } from '@inertiajs/react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import React from 'react';
import { BookOpen, Users, ArrowRight, Loader2, AlertCircle, GraduationCap } from 'lucide-react';

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
        enabled: !!selectedSchoolYearEntry?.id,
        staleTime: 1000 * 60 * 5,
    });

    return (
        <div className='space-y-4'>
            <SchoolYearPicker />

            <Card className="shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="text-xl flex items-center gap-2">
                        <BookOpen className="w-5 h-5" />
                        Subject List
                    </CardTitle>
                    <CardDescription>
                        {subjects.length > 0 && `${subjects.length} subject${subjects.length !== 1 ? 's' : ''} assigned`}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                            <Loader2 className="w-8 h-8 animate-spin mb-3" />
                            <p className="text-sm">Loading subjects...</p>
                        </div>
                    ) : isError ? (
                        <div className="flex flex-col items-center justify-center py-12 text-destructive">
                            <AlertCircle className="w-8 h-8 mb-3" />
                            <p className="text-sm font-medium">Failed to load subjects</p>
                            <p className="text-xs text-muted-foreground mt-1">Please try again later</p>
                        </div>
                    ) : subjects.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                            <BookOpen className="w-12 h-12 mb-3 opacity-30" />
                            <p className="text-sm font-medium">No subjects assigned</p>
                            <p className="text-xs mt-1">Check back later or contact administration</p>
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="font-semibold">Subject</TableHead>
                                        <TableHead className="font-semibold">Section</TableHead>
                                        <TableHead className="text-right font-semibold">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {subjects.map((subject, index) => (
                                        <TableRow
                                            key={subject.id}
                                            className="group hover:bg-muted/50 transition-colors"
                                        >
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                                                        {index + 1}
                                                    </div>
                                                    <span>{subject.descriptive_title}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Users className="w-4 h-4 text-muted-foreground" />
                                                    <span className="font-mono text-sm">
                                                        {subject.course_name_abbreviation}-{subject.year_level_id}{subject.section}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className='text-right'>
                                                <Link href={`/subjects-list/${subject.hashed_year_section_subject_id}`}>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="group/btn hover:bg-primary hover:text-primary-foreground transition-all"
                                                    >
                                                        Open
                                                        <ArrowRight className="w-4 h-4 ml-1 group-hover/btn:translate-x-1 transition-transform" />
                                                    </Button>
                                                </Link>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

InstructorSubjectsList.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;