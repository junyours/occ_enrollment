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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/Components/ui/tooltip";
import { Download } from "lucide-react";
import EnhancedDownloadDialog from "./EnhancedDownloadDialog";

export default function EnrollmentCourseSection({ courseId, error, course, schoolYearId, forSchoolYear = false, semester, schoolYear }) {
    const user = usePage().props.auth.user;

    const [yearLevels, setYearLevels] = useState([]);
    const [fetching, setFetching] = useState(true);

    const { toast } = useToast()
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const [isDownloading, setIsDownloading] = useState(false);

    const { data, setData, post, processing, errors, reset, setError, clearErrors } = useForm({
        course_id: courseId,
        year_level_id: 0,
        section: "",
        max_students: 50
    });

    // const [processing, setProcessing] = useState(false);

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

        // Allow only numbers
        if (!/^\d*$/.test(value)) return;

        setData("max_students", value);
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
            <PageTitle className="mb-4" align="center">{course.course_name}</PageTitle>

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
                                                    {(user.user_role == "registrar" || user.user_role == "program_head") && (
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    disabled={!section.student_count}
                                                                    variant="icon"
                                                                    className={`py-0 h-min ${section.student_count ? 'text-yellow-500' : ''}`}
                                                                    onClick={() => handleDownload(section.year_level_id, section.section)}
                                                                >
                                                                    <Download className="h-4 w-4" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            {section.student_count ? (
                                                                <TooltipContent>Download Students</TooltipContent>
                                                            ) : (
                                                                <></>
                                                            )}
                                                        </Tooltip>
                                                    )}
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
                                                    <Link href={route(forSchoolYear ? 'enrollment.view.students' : 'enrollment.view.students', {
                                                        id: courseId,
                                                        yearlevel: yearLevel.year_level_name.replace(/\s+/g, '-')
                                                    }) + `?section=${section.section}`}>
                                                        <Button className="text-green-500 h-auto py-0" variant="link">Students</Button>
                                                    </Link>
                                                    {!forSchoolYear && (
                                                        <Link href={route('enrollment.view.enroll-student', {
                                                            id: courseId,
                                                            yearlevel: yearLevel.year_level_name.replace(/\s+/g, '-')
                                                        }) + `?section=${section.section}`}>
                                                            <Button className="text-blue-500 hidden sm:inline h-auto py-0" variant="link">Enroll Student</Button>
                                                        </Link>
                                                    )}
                                                </TableCell>
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
        </div>
    );
}

EnrollmentCourseSection.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
