import React, { useEffect, useState } from "react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import { usePage, useForm } from "@inertiajs/react";
import { cn } from "@/Lib/Utils"
import { Button } from "@/Components/ui/button"
import { Input } from "@/Components/ui/input"
import { Label } from "@/Components/ui/label"
import { useToast } from "@/hooks/use-toast";
import { Link } from "@inertiajs/react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/Components/ui/table"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/Components/ui/dialog"

import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/Components/ui/card"
import { Head } from '@inertiajs/react';
import axios from "axios";
import PreLoader from "@/Components/preloader/PreLoader";
import { Separator } from "@/Components/ui/separator"
import { PageTitle } from "@/Components/ui/PageTitle";
import { Download, Ellipsis, Pencil, Trash } from "lucide-react";
import EnhancedDownloadDialog from "./EnhancedDownloadDialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/Components/ui/popover";

export default function EnrollmentCourseSection({ courseId, error, course, schoolYearId, forSchoolYear = false, semester, schoolYear }) {
    const user = usePage().props.auth.user;

    const [yearLevels, setYearLevels] = useState([]);
    const [fetching, setFetching] = useState(true);

    const { toast } = useToast()
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const [editing, setEditing] = useState(false);

    const [isDownloading, setIsDownloading] = useState(false);

    const { data, setData, post, processing, errors, reset, setError, clearErrors } = useForm({
        id: 0,
        course_id: courseId,
        year_level_id: 0,
        section: "",
        max_students: 50
    });

    const yearLevel =
        data.year_level_id === 1 ? 'First year' :
            data.year_level_id === 2 ? 'Second year' :
                data.year_level_id === 3 ? 'Third year' :
                    data.year_level_id === 4 ? 'Fourth year' : '';

    const createNewSection = (year_level_id) => {
        setData('year_level_id', year_level_id);
        setIsDialogOpen(true);

        yearLevels.some((yearLevel) => {
            if (yearLevel.id == year_level_id) {
                const yearSection = yearLevel.year_section.length;

                const sectionLetter = String.fromCharCode(65 + yearSection);

                setData('section', sectionLetter)
                return true;
            }
        });
    };

    const maxStudentsOnChange = (e) => {
        const { name, value } = e.target;
        if (!value) {
            setError('max_students', { error: true })
        } else {
            clearErrors();
        }

        // Allow only numbers
        if (!/^\d*$/.test(value)) return;

        setData("max_students", value);
        clearErrors(name)
    };

    const sectionOnChange = (e) => {
        const { name, value } = e.target;
        if (!value) {
            setError('section', { error: true })
        } else {
            clearErrors();
        }

        setData("section", value);
        clearErrors(name)
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        const maxStudents = parseInt(data.max_students, 10);

        if (!maxStudents || maxStudents < 15 || maxStudents > 100) {
            setError("max_students", "Max students must be between 15 and 100.");
            return;
        }

        post(route('add.new.section', { schoolYearId }), {
            onSuccess: () => {
                reset();
                setIsDialogOpen(false);
                toast({
                    description: "Section added successfully.",
                    variant: "success",
                });
                getEnrollmentCourseSection();
            },
            onError: (errors) => {
                if (errors.curriculum_id) {
                    toast({
                        description: errors.curriculum_id,
                        variant: "destructive",
                    });
                }
            },
            preserveScroll: true,
        });
    };

    const submitEdit = (e) => {
        post(route('edit.section'), {
            onSuccess: () => {
                reset();
                toast({
                    description: "Section edited successfully.",
                    variant: "success",
                });
                getEnrollmentCourseSection();
                reset();
                setEditing(false);
            },
            onError: (errors) => {
                if (errors.curriculum_id) {
                    toast({
                        description: errors.curriculum_id,
                        variant: "destructive",
                    });
                }
            },
            preserveScroll: true,
        });
    };

    const deleteSection = (id) => {
        post(route('delete.section', { id: id }), {
            onSuccess: () => {
                toast({
                    description: "Section deleted successfully.",
                    variant: "success",
                });
                getEnrollmentCourseSection();
            },
            onError: (errors) => {
                if (errors.curriculum_id) {
                    toast({
                        description: errors.curriculum_id,
                        variant: "destructive",
                    });
                }
            },
            preserveScroll: true,
        });
    };

    const getEnrollmentCourseSection = async () => {
        await axios.post(`/enrollment/${courseId}/${schoolYearId}`)
            .then(response => {
                setYearLevels(response.data)
            })
            .finally(() => {
                setFetching(false)
            })
    }

    useEffect(() => {
        getEnrollmentCourseSection()
    }, [])

    const closeAddingSectionDialog = () => {
        setIsDialogOpen(false)
        clearErrors()
    }

    if (fetching) return <PreLoader title="Sections" />

    if (error) return

    const handleDownload = async (yearlevel, section) => {
        setIsDownloading(true); // open your modal

        try {
            const response = await axios.get(
                route('download.section.students', {
                    schoolYearId,
                    courseId,
                    yearlevel,
                    section,
                }),
                {
                    responseType: 'blob',
                }
            );

            const contentDisposition = response.headers['content-disposition'];
            let filename = 'students.xlsx';

            if (contentDisposition) {
                const match = contentDisposition.match(/filename="?([^"]+)"?/);
                if (match) {
                    filename = match[1];
                }
            }

            const blob = new Blob([response.data], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            });

            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.setAttribute('download', filename);
            document.body.appendChild(a);
            a.click();
            a.remove();
        } catch (err) {
            toast({
                description: "Failed to download file.",
                variant: "destructive",
            });
        } finally {
            setTimeout(() => setIsDownloading(false), 500); // close modal
        }
    };

    return (
        <div className="container">
            <Head title="Sections" />
            <PageTitle className="mb-4" align="center"> {course.course_name} {course.major && ` MAJOR IN ${course.major}`}</PageTitle>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {yearLevels && yearLevels.length > 0 ? (
                    yearLevels.map((yearLevel) => (
                        <Card key={yearLevel.id} className={cn("w-full")}>
                            <div className="flex justify-between items-center mb-2">
                                <CardHeader>
                                    <CardTitle className="text-2xl">{yearLevel.year_level_name}</CardTitle>
                                </CardHeader>
                                {user.user_role == "program_head" && (
                                    <CardHeader className="px-6 mt-4">
                                        <Button
                                            onClick={() => createNewSection(yearLevel.id)}
                                        >
                                            Add Section
                                        </Button>
                                    </CardHeader>
                                )}
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
                                        {yearLevel.year_section.map((section, index) => (
                                            <TableRow key={index}>
                                                {(editing && data.id == section.id) ? (
                                                    <>
                                                        <TableCell>
                                                            <Input
                                                                onChange={sectionOnChange}
                                                                className={`${errors.section && "border-red-500"} w-14`}
                                                                value={data.section}
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Input
                                                                value={data.max_students}
                                                                onChange={maxStudentsOnChange}
                                                                className={`${errors.max_students && "border-red-500"} w-14`}
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="w-full flex gap-2 justify-end">
                                                                <Button variant='outline' onClick={() => {
                                                                    setEditing(false);
                                                                    reset();
                                                                    clearErrors();
                                                                }}>
                                                                    Cancel
                                                                </Button>
                                                                <Button onClick={submitEdit} disabled={!data.section || !data.max_students}>Done</Button>
                                                            </div>
                                                        </TableCell>
                                                    </>
                                                ) : (
                                                    <>
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
                                                            {user.user_role == "program_head" && (
                                                                <>
                                                                    {forSchoolYear ? (
                                                                        <Link href={route('school-year.view.class', {
                                                                            schoolyear: `${schoolYear.start_year}-${schoolYear.end_year}`,
                                                                            semester: semester,
                                                                            hashedCourseId: courseId,
                                                                            yearlevel: yearLevel.year_level_name.replace(/\s+/g, '-')
                                                                        }) + `?section=${section.section}`}>
                                                                            <Button className="text-purple-500 h-auto py-0" variant="link">Class</Button>
                                                                        </Link>
                                                                    ) : (
                                                                        <Link href={route('enrollment.view.class', {
                                                                            id: courseId,
                                                                            yearlevel: yearLevel.year_level_name.replace(/\s+/g, '-')
                                                                        }) + `?section=${section.section}`}>
                                                                            <Button className="text-purple-500 h-auto py-0" variant="link">Class</Button>
                                                                        </Link>
                                                                    )}

                                                                </>
                                                            )}

                                                            {forSchoolYear ? (
                                                                <Link href={route('school-year.view.students', {
                                                                    schoolyear: `${schoolYear.start_year}-${schoolYear.end_year}`,
                                                                    semester: semester,
                                                                    hashedCourseId: courseId,
                                                                    yearlevel: yearLevel.year_level_name.replace(/\s+/g, '-')
                                                                }) + `?section=${section.section}`}>
                                                                    <Button className="text-green-500 h-auto py-0" variant="link">Students</Button>
                                                                </Link>
                                                            ) : (
                                                                <Link href={route('enrollment.view.students', {
                                                                    id: courseId,
                                                                    yearlevel: yearLevel.year_level_name.replace(/\s+/g, '-')
                                                                }) + `?section=${section.section}`}>
                                                                    <Button className="text-green-500 h-auto py-0" variant="link">Students</Button>
                                                                </Link>
                                                            )}

                                                            {!forSchoolYear && (
                                                                <Link href={route('enrollment.view.enroll-student', {
                                                                    id: courseId,
                                                                    yearlevel: yearLevel.year_level_name.replace(/\s+/g, '-')
                                                                }) + `?section=${section.section}`}>
                                                                    <Button className="text-blue-500 hidden sm:inline h-auto py-0" variant="link">Enroll Student</Button>
                                                                </Link>
                                                            )}

                                                            {(user.user_role == "registrar" || user.user_role == "program_head") && (
                                                                <Popover>
                                                                    <PopoverTrigger asChild>
                                                                        <Button variant='ghost' className=''>
                                                                            <Ellipsis />
                                                                        </Button>
                                                                    </PopoverTrigger>
                                                                    <PopoverContent align='start' className="w-36 space-y-2 flex flex-col">
                                                                        <Button
                                                                            disabled={!section.student_count}
                                                                            onClick={() => handleDownload(section.year_level_id, section.section)}
                                                                            variant='outline'
                                                                            className='flex justify-start'>
                                                                            Students <Download className="text-orange-500" />
                                                                        </Button>
                                                                        {user.user_role == "program_head" && (
                                                                            <>
                                                                                <Button
                                                                                    variant='outline'
                                                                                    className='flex justify-start'
                                                                                    onClick={() => {
                                                                                        setEditing(true)
                                                                                        setData('id', section.id)
                                                                                        setData('year_level_id', section.year_level_id)
                                                                                        setData('section', section.section)
                                                                                        setData('max_students', section.max_students)
                                                                                    }}
                                                                                >
                                                                                    Edit <Pencil className="text-green-500" />
                                                                                </Button>
                                                                                <Button
                                                                                    disabled={!!section.student_count}
                                                                                    variant='outline'
                                                                                    className='flex justify-start'
                                                                                    onClick={() => deleteSection(section.id)}
                                                                                >
                                                                                    Delete <Trash className="text-red-500" />
                                                                                </Button>
                                                                            </>
                                                                        )}
                                                                    </PopoverContent>
                                                                </Popover>
                                                            )}
                                                        </TableCell>
                                                    </>
                                                )}
                                            </TableRow>
                                        ))}

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


            {/* Dialog Component (Outside of the Map Loop) */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Add New Section</DialogTitle>
                        <DialogDescription>
                            Adding a new section <span className="text-green-500 font-semibold">{data.section}</span> for {yearLevel}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid w-full max-w-sm items-center gap-1.5">
                            <Label htmlFor="max-students">Max students</Label>
                            <Input
                                name="max_students"
                                value={data.max_students}
                                onChange={maxStudentsOnChange}
                                type="text"
                                id="max-students"
                                placeholder="Max students"
                            />
                            {errors.max_students && <p className="text-red-500">{errors.max_students}</p>}
                        </div>{errors.curriculum_id && (
                            <div className="text-red-500">{errors.curriculum_id}</div>
                        )}
                        <DialogFooter>
                            {/* Cancel button explicitly set to type="button" so it's not triggered on Enter */}
                            <Button
                                type="button"
                                disabled={processing}
                                variant="outline"
                                onClick={closeAddingSectionDialog}>
                                Cancel
                            </Button>
                            {/* Submit button comes first, so Enter triggers this instead of Cancel */}
                            <Button
                                type="submit"
                                disabled={processing}
                                className="disabled:bg-blue-400">
                                Submit
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
            <EnhancedDownloadDialog
                isDownloading={isDownloading}
                setIsDownloading={setIsDownloading}
            />
        </div >
    );
}

EnrollmentCourseSection.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
