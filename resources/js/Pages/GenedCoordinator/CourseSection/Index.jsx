import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/Components/ui/card';
import { PageTitle } from '@/Components/ui/PageTitle';
import { Separator } from '@/Components/ui/separator';
import { useSchoolYearStore } from '@/Components/useSchoolYearStore';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { Link } from '@inertiajs/react';
import CourseSectionsSkeleton from './CourseSectionsSekeleton';
import { AlertCircle, BookOpen } from 'lucide-react';

const yearLevelWord = {
    1: 'First-Year',
    2: 'Second-Year',
    3: 'Third-Year',
    4: 'Fourth-Year'
}

export default function CourseSections({ course, hashedCourseID }) {
    const { selectedSchoolYearEntry } = useSchoolYearStore();

    if (!course) return <CourseSectionsSkeleton />

    const getSections = async () => {
        const response = await axios.post('', {
            schoolYearId: selectedSchoolYearEntry.id,
        })
        return response.data;
    };

    const { data = [], isLoading, isError } = useQuery({
        queryKey: ['gened-coordinator.sections', course.id, selectedSchoolYearEntry?.id],
        queryFn: getSections,
        enabled: !!selectedSchoolYearEntry?.id && !!course.id,
    });

    return (
        <div className='space-y-4'>
            <PageTitle align='center'>{course.course_name} {course.major && ` MAJOR IN ${course.major}`}</PageTitle>

            {isLoading ? (
                <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <CourseSectionsSkeleton />
                </div>
            ) : isError ? (
                <div className="flex flex-col items-center justify-center py-12 text-destructive">
                    <AlertCircle className="w-8 h-8 mb-3" />
                    <p className="text-sm font-medium">Failed to load requests</p>
                    <p className="text-xs text-muted-foreground mt-1">Please try again later</p>
                </div>
            ) : data.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <BookOpen className="w-12 h-12 mb-3 opacity-30" />
                    <p className="text-sm font-medium">No sections</p>
                    <p className="text-xs mt-1">Check back later or contact administration</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {data && data.length > 0 ? (
                        data.map((yearLevel) => (
                            <Card key={yearLevel.id} className="w-full">
                                <div className="flex justify-between items-center mb-2">
                                    <CardHeader>
                                        <CardTitle className="text-2xl">{yearLevel.year_level_name}</CardTitle>
                                    </CardHeader>
                                </div>
                                <Separator />
                                <CardContent className="grid gap-4">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="w-min">Section</TableHead>
                                                <TableHead className="w-max">Students</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {yearLevel.year_section.map((section, index) => {
                                                const yearLevel = yearLevelWord[section.year_level_id]

                                                return (
                                                    <TableRow key={index}>
                                                        <TableCell className="font-medium">{section.section}</TableCell>
                                                        <TableCell
                                                            className={`p-2 ${section.student_count > section.max_students
                                                                ? "text-red-600 font-bold" // Overload
                                                                : section.student_count === section.max_students
                                                                    ? "text-green-600 font-bold" // Complete
                                                                    : section.student_count + 5 >= section.max_students
                                                                    && "text-orange-400 font-bold" // Almost complete (87.5% or higher)
                                                                }`}
                                                        >
                                                            {section.student_count}/{section.max_students}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <Link href={`/gened-coordinator/sections/${hashedCourseID}/class/${yearLevel}?section=${section.section}`}>
                                                                <Button className="text-purple-500 h-auto py-0" variant="link">Class</Button>
                                                            </Link>
                                                        </TableCell>
                                                    </TableRow>
                                                )
                                            })}

                                            {yearLevel.year_section.length < 1 &&
                                                <TableRow>
                                                    <TableCell className="font-semibold">No section </TableCell>
                                                </TableRow>
                                            }
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        ))
                    ) : (
                        <p className="text-gray-500">No year levels found.</p>
                    )}
                </div>
            )}
        </div>
    )
}

CourseSections.layout = page => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
