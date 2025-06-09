import React, { useEffect, useState } from 'react';
import axios from 'axios';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/Components/ui/card';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/Components/ui/table';
import { Button } from '@/Components/ui/button';
import PreLoader from '@/Components/preloader/PreLoader';
import { Head, useForm, usePage } from '@inertiajs/react';
import { Eye, SquarePlus } from 'lucide-react';
import {
    AlertDialog,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/Components/ui/alert-dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/Components/ui/select"
import { Skeleton } from '@/Components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/Components/ui/dialog';
import { Input } from '@/Components/ui/input';

export default function CoursesCurriculumLists() {
    const [coursesCurriculums, setCoursesCurriculums] = useState([]);
    const [activeCurriculums, setActiveCurriculums] = useState([]);
    const [courseCurriculums, setCourseCurriculums] = useState([]);
    const [fetching, setFetching] = useState(true);
    const [gettingSchoolYear, setGettingSchoolYear] = useState(true);
    const [currActiveOpen, setCurrActiveOpen] = useState(false)
    const [currAddOpen, setCurrAddOpen] = useState(false)

    const [selectedCourse, serSelectedCourse] = useState({
        courseId: 0,
        course_name: '',
        course_name_abb: ''
    })

    const { data, setData, post, processing, errors, reset } = useForm({
        course_id: '',
        school_year_start: '',
        school_year_end: '',
        course_name: '',
        course_name_abb: ''
    });

    const yearLevels = ["First Year", "Second Year", "Third Year", "Fourth Year"];

    const getCurrs = async () => {
        await axios.post(route('courses.curriculum.list'))
            .then(response => {
                setCoursesCurriculums(response.data);
            })
            .finally(() => {
                setFetching(false);
            })
            .catch(error => console.error("Error fetching data:", error));
    }

    useEffect(() => {
        getCurrs();
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

    const openAddCurriculum = async (courseId, course_name, course_name_abb) => {
        const currentYear = new Date().getFullYear();
        const nextYear = currentYear + 1;

        setData('course_id', courseId);
        setData('course_name', course_name);
        setData('course_name_abb', course_name_abb);
        setData('school_year_start', currentYear);
        setData('school_year_end', nextYear);

        setCurrAddOpen(true)
    }

    const submit = async () => {
        await post(route('curr.schoolyear'), {
            onSuccess: () => {
                setCurrAddOpen(false);
                getCurrs();
            },
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
                                        onClick={() => openAddCurriculum(course.id, course.course_name, course.course_name_abbreviation)}>
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
                        <AlertDialogTitle>Active Curriculum</AlertDialogTitle>
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
                    )}
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setCurrActiveOpen(false)}>Done</AlertDialogCancel>
                    </AlertDialogFooter>
                </AlertDialogContent >
            </AlertDialog >

            <Dialog open={currAddOpen} onOpenChange={setCurrAddOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Curriculum School Year</DialogTitle>
                        <DialogDescription>{data.course_name} ({data.course_name_abb})</DialogDescription>
                    </DialogHeader>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            type="button"
                            onClick={() => {
                                setData('school_year_start', Number(data.school_year_start) - 1)
                                setData('school_year_end', Number(data.school_year_end) - 1)
                            }}
                            className="px-2 py-1 border rounded-l"
                            disabled={data.school_year_start <= 1900}
                        >
                            -
                        </Button>
                        <div className="flex items-center">
                            <Input
                                readOnly={true}
                                name="school_year_start"
                                value={data.school_year_start}
                                min="1900"
                                max="2100"
                                placeholder="YYYY"
                                className="rounded-none text-center"
                            />
                        </div>

                        <span className="text-center">-</span>

                        <div className="flex items-center">
                            <Input
                                readOnly={true}
                                name="school_year_end"
                                value={data.school_year_end}
                                min="1900"
                                max="2100"
                                placeholder="YYYY"
                                className="rounded text-center"
                            />
                        </div>
                        <Button
                            variant="ghost"
                            type="button"
                            onClick={() => {
                                setData('school_year_start', Number(data.school_year_start) + 1)
                                setData('school_year_end', Number(data.school_year_end) + 1)
                            }}
                            className="px-2 py-1 border rounded-r"
                            disabled={data.school_year_start >= 2100}
                        >
                            +
                        </Button>
                    </div>
                    {errors.school_year && (
                        <div className="text-red-500 text-sm">
                            {errors.school_year}
                        </div>
                    )}
                    <DialogFooter>
                        <Button disabled={processing} onClick={submit} type="submit">Submit</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

CoursesCurriculumLists.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
