import React, { useEffect, useState } from 'react';
import axios from 'axios';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Button } from '@/Components/ui/button';
import PreLoader from '@/Components/preloader/PreLoader';
import { Head } from '@inertiajs/react';
import { Eye, SquarePlus, LoaderCircle } from 'lucide-react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Skeleton } from '@/Components/ui/skeleton';

export default function CoursesCurriculumLists() {
    const [coursesCurriculums, setCoursesCurriculums] = useState([]);
    const [activeCurriculums, setActiveCurriculums] = useState([]);
    const [courseCurriculums, setCourseCurriculums] = useState([]);
    const [fetching, setFetching] = useState(true);
    const [gettingSchoolYear, setGettingSchoolYear] = useState(true);
    const [currActiveOpen, setCurrActiveOpen] = useState(false)

    const [selectedCourse, serSelectedCourse] = useState({
        courseId: 0,
        course_name: '',
        course_name_abb: ''
    })

    const yearLevels = ["First Year", "Second Year", "Third Year", "Fourth Year"];

    useEffect(() => {
        axios.post(route('courses.curriculum.list'))
            .then(response => {
                setCoursesCurriculums(response.data);
            })
            .finally(() => {
                setFetching(false);
            })
            .catch(error => console.error("Error fetching data:", error));
    }, []);

    const openActiveCurriculum = async (courseId, course_name, course_name_abb) => {
        serSelectedCourse({
            courseId: courseId,
            course_name: course_name,
            course_name_abb: course_name_abb
        })
        setGettingSchoolYear(true)
        setCurrActiveOpen(true)

        await axios.post('get-course-active-curriculum', { courseId: courseId })
            .then(response => {
                setActiveCurriculums(response.data.active_currs)
                setCourseCurriculums(response.data.curriculums)
            })
            .finally(() => {
                setGettingSchoolYear(false)
            })
    }

    const setActiveCurr = async (name, value) => {
        setActiveCurriculums(prev => ({
            ...prev,
            [name]: value
        }));

        await axios.post('set-curriculum-term-active', { courseId: selectedCourse.courseId, yearLevel: name, curriculumId: value })
    };

    if (fetching) return <PreLoader title="Curriculum List" />

    return (
        <>
            <Head title="Curriculum List" />
            {coursesCurriculums.length === 0 ? (
                <p className="text-gray-500">No courses available.</p>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {coursesCurriculums.map((course) => (
                        <Card key={course.id}>
                            <CardHeader className="mb-2">
                                <CardTitle>{course.course_name} ({course.course_name_abbreviation})</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="h-60 overflow-y-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>School Year</TableHead>
                                                <TableHead>Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {course.curriculum.length === 0 ? (
                                                <TableRow>
                                                    <TableCell className="text-center text-gray-500" colSpan={2}>
                                                        No curriculums available.
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                course.curriculum.map((curriculum) => (
                                                    <TableRow key={curriculum.id}>
                                                        <TableCell>
                                                            {curriculum.school_year_start} - {curriculum.school_year_end}
                                                        </TableCell>
                                                        <TableCell>
                                                            <a
                                                                href={`/curriculum/${course.hashed_course_id}/${curriculum.school_year_start}-${curriculum.school_year_end}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                            >
                                                                <Button variant="link" size="sm">Open</Button>
                                                            </a>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                            <CardFooter>
                                <div className="flex justify-end gap-2 mb-2">
                                    <Button
                                        variant="default"
                                        size="sm"
                                        onClick={() => openActiveCurriculum(course.id, course.course_name, course.course_name_abbreviation)}>
                                        Add Curriculum
                                        <SquarePlus className="w-5 h-5" />
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => openActiveCurriculum(course.id, course.course_name, course.course_name_abbreviation)}>
                                        Active Curriculum
                                        <Eye className="w-5 h-5" />
                                    </Button>
                                </div>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}

            <AlertDialog open={currActiveOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle onClick={() => console.log(activeCurriculums)}>Active Curriculum</AlertDialogTitle>
                        <AlertDialogDescription>
                            {selectedCourse.course_name} ({selectedCourse.course_name_abb})
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    {gettingSchoolYear ? (
                        <div className='space-y-1'>
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                    ) : (
                        <div className='space-y-2'>
                            {yearLevels.map((year, index) => (
                                <div key={index} className="flex items-center justify-between border rounded-[0.3] px-2">
                                    <span className="font-medium">{year}</span>
                                    <Select name={String(index + 1)} value={activeCurriculums[String(index + 1)]} onValueChange={(value) => setActiveCurr(String(index + 1), value)}>
                                        <SelectTrigger className="border-0 focus:ring-0 w-32">
                                            <SelectValue placeholder="School Year" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {courseCurriculums.map(currs => (
                                                <SelectItem key={currs.id} value={currs.id}>
                                                    {currs.school_year_start} - {currs.school_year_end}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            ))}
                        </div>
                    )
                    }
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setCurrActiveOpen(false)}>Done</AlertDialogCancel>
                    </AlertDialogFooter>
                </AlertDialogContent >
            </AlertDialog >
        </>
    );
}

CoursesCurriculumLists.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
