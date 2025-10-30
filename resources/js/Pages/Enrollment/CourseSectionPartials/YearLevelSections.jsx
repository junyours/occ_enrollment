import { Button } from '@/Components/ui/button';
import { Input } from '@/Components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/Components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { Link, usePage } from '@inertiajs/react';
import { ArrowRight, Download, Ellipsis, FileStack, Pencil, Trash } from 'lucide-react';
import React from 'react'
import { useToast } from "@/hooks/use-toast";
import axios from 'axios';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/Components/ui/tooltip';

function YearLevelSections({
    yearLevel,
    editing,
    data,
    sectionOnChange,
    errors,
    maxStudentsOnChange,
    setEditing,
    reset,
    forSchoolYear = false,
    courseId,
    setData,
    submitEdit,
    post,
    getEnrollmentCourseSection,
    setIsDownloading,
    schoolYearId,
    schoolYear,
    allowEnrollment
}) {
    const user = usePage().props.auth.user;
    const userRole = user.user_role;

    const { toast } = useToast()

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
                                    {(userRole == "program_head" || userRole == "registrar") && (
                                        <>
                                            {forSchoolYear ? (
                                                <Link href={route('school-year.view.class', {
                                                    schoolyear: `${schoolYear.start_year}-${schoolYear.end_year}`,
                                                    semester: schoolYear.semester.semester_name,
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
                                            semester: schoolYear.semester.semester_name,
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

                                    {(!forSchoolYear) ? (
                                        allowEnrollment ? (
                                            <Link
                                                href={route('enrollment.view.enroll-student', {
                                                    id: courseId,
                                                    yearlevel: yearLevel.year_level_name.replace(/\s+/g, '-')
                                                }) + `?section=${section.section}`}
                                            >
                                                <Button className="text-blue-500 hidden sm:inline h-auto py-0" variant="link">
                                                    Enroll Student
                                                </Button>
                                            </Link>
                                        ) : (
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <span>
                                                        <Button
                                                            disabled
                                                            className="text-blue-500 hidden sm:inline h-auto py-0 pointer-events-none"
                                                            variant="link"
                                                        >
                                                            Enroll Student
                                                        </Button>
                                                    </span>
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p>Enrollment is not allowed at this time</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        )
                                    ) : (
                                        userRole === 'registrar' && (
                                            <>
                                                {/* allowEnrollment ? (
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <span>
                                                            <Button
                                                                disabled
                                                                className="text-blue-500 hidden sm:inline h-auto py-0 pointer-events-none"
                                                                variant="link"
                                                            >
                                                                Enroll Student
                                                            </Button>
                                                        </span>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>Enrollment is not allowed at this time</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                                ) : (
                                                <Link>
                                                    <Button className="text-blue-500 hidden sm:inline h-auto py-0" variant="link">
                                                        Enroll Student
                                                    </Button>
                                                </Link>
                                                ) */}
                                            </>
                                        )
                                    )}

                                    {(userRole == "registrar" || userRole == "program_head") && (
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button variant='ghost' className=''>
                                                    <Ellipsis />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent align='start' className="w-36 space-y-2 flex flex-col">
                                                <Link href={route('enrollment.view.cor', {
                                                    id: courseId,
                                                    yearlevel: yearLevel.year_level_name.replace(/\s+/g, '-')
                                                }) + `?section=${section.section}`}>
                                                    <Button
                                                        disabled={!section.student_count}
                                                        variant='outline'
                                                        className='flex justify-between'>
                                                        COR LIST <ArrowRight className="text-violet-500" />
                                                    </Button>
                                                </Link>
                                                <Button
                                                    disabled={!section.student_count}
                                                    onClick={() => handleDownload(section.year_level_id, section.section)}
                                                    variant='outline'
                                                    className='flex justify-start'>
                                                    Students <Download className="text-orange-500" />
                                                </Button>
                                                {userRole == "program_head" && (
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
    )
}

export default YearLevelSections
