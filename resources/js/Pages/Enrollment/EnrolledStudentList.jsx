import React, { useEffect, useState } from 'react'
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import DataTable from "@/Components/ui/DataTable";
import { PageTitle } from '@/Components/ui/PageTitle';
import { Head, Link, usePage } from '@inertiajs/react';
import PreLoader from '@/Components/preloader/PreLoader';
import { formatFullName, formatFullNameFML } from '@/Lib/Utils';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardHeader } from '@/Components/ui/card';
import { MoveRightIcon, UserMinus } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/Components/ui/tooltip';
import StudentActions from './StudentActions';
import { useToast } from "@/hooks/use-toast";
import { router } from '@inertiajs/react';
import axios from 'axios';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/Components/ui/dialog';
import { Table, TableBody, TableCell, TableRow } from '@/Components/ui/table';

export default function EnrolledStudentList({ hashedCourseId, courseId, yearlevel, section, yearSectionId, courseName, forSchoolYear = false, schoolYear, semester }) {
    const [loading, setLoading] = useState(true);
    const [students, setStudents] = useState([]);
    const { toast } = useToast()

    const yearLevelName =
        yearlevel == 1 ? 'First Year' :
            yearlevel == 2 ? 'Second Year' :
                yearlevel == 3 ? 'Third Year' :
                    yearlevel == 4 ? 'Fourth Year' : '';

    const getEnrolledStudentList = async () => {
        await axios.post(route('get.enrolled.student.list', { id: courseId, yearlevel: yearlevel, yearSectionId: yearSectionId }))
            .then(response => {
                setStudents(response.data)
                console.log(response.data)
            })
            .finally(() => {
                setLoading(false);
            })
    }

    useEffect(() => {
        getEnrolledStudentList();
    }, [])


    // state to control modal
    const [studentToUnenroll, setStudentToUnenroll] = useState(null);
    const [showModal, setShowModal] = useState(false);

    const unEnrollStudent = async (id) => {
        try {
            await router.delete(route('enrollment.unenroll', id), {
                preserveScroll: true,
                onSuccess: () => {
                    // Remove the student from the list
                    setStudents(prev => prev.filter(student => student.id !== id));

                    // Close the modal
                    setShowModal(false);

                    // Show success message
                    toast({
                        description: "Student Unenrolled.",
                        variant: "success",
                    });
                },
            });
        } catch (error) {
            console.error("Unenrollment failed", error);
        }
    };

    const openUnenrollModal = (studentId) => {
        const student = students.find(student => student.id == studentId)
        setStudentToUnenroll(student);
        setShowModal(true);
    };

    const handleUnenroll = () => {
        if (studentToUnenroll) {
            unEnrollStudent(studentToUnenroll.id);
        }
    };

    const [sections, setSections] = useState([]);
    const [studentToMove, setstudentToMove] = useState({});
    const [movingStudent, setMovingStudent] = useState(false);
    const [processing, setProcessing] = useState(false);

    const openMoveStudentModal = async (student) => {
        setstudentToMove(student);
        setMovingStudent(true);

        if (!sections.length > 0) {
            axios.post(route('yearlevel.sections', { yearSectionId: yearSectionId }))
                .then(response => {
                    setSections(response.data);
                    console.log(response.data);
                })
        }
    }

    const moveStudent = async (id) => {
        setProcessing(true);
        axios.post(route('move.student', { enrolledStudentId: studentToMove.id, yearSectionId: id }))
            .then(response => {
                if (response.data.message == 'success') {
                    toast({
                        description: "Moving success.",
                        variant: "success",
                    });
                    getEnrolledStudentList();
                }
            })
            .finally(() => {
                setstudentToMove({});
                setMovingStudent(false);
                setProcessing(false);
            })
    }

    const columns = [
        {
            colName: "Student ID no.",
            accessorKey: "user_id_no",
            header: "Student ID no.",
            headerClassName: 'w-32',
        },
        {
            colName: "Name",
            accessorKey: "name",
            header: "Name",
            headerClassName: 'w-52',
            filterValue: (row) => {
                const { first_name, middle_name, last_name } = row;
                return formatFullName({ first_name, middle_name, last_name }).toLowerCase();
            },
            cell: ({ row }) => {
                const { first_name, middle_name, last_name } = row.original;
                const formattedName = formatFullName({ first_name, middle_name, last_name });
                return <div className="font-medium">{formattedName}</div>;
            },
        },
        {
            colName: "Email",
            accessorKey: "email_address",
            header: "Email",
        },
        {
            colName: "Actions",
            header: "Actions",
            headerClassName: 'w-32 text-right',
            cell: ({ row }) => {
                const { user_id_no, id } = row.original;
                const student = row.original;
                return (
                    <div className="flex justify-end gap-2 items-center">
                        <Link
                            href={`${route('enrollment.view.student.subjects', {
                                id: hashedCourseId,
                                yearlevel: yearLevelName ? yearLevelName.replace(/\s+/g, '-') : 'First-Year'
                            })}?section=${encodeURIComponent(section)}&id-no=${user_id_no}`}
                        >
                            <Button className="text-green-500 h-auto py-0" variant="link">
                                Subjects
                            </Button>
                        </Link>
                        {forSchoolYear ? (
                            <Link
                                href={`${route('school-year.view.student.cor', {
                                    schoolyear: `${schoolYear.start_year}-${schoolYear.end_year}`,
                                    semester: semester,
                                    hashedCourseId: hashedCourseId,
                                    yearlevel: yearLevelName ? yearLevelName.replace(/\s+/g, '-') : 'First-Year'
                                })}?section=${encodeURIComponent(section)}&id-no=${user_id_no}`}
                            >
                                <Button className="text-blue-500 h-auto py-0" variant="link">
                                    COR
                                </Button>
                            </Link>
                        ) : (
                            <Link
                                href={`${route('enrollment.view.student.cor', {
                                    id: hashedCourseId,
                                    yearlevel: yearLevelName ? yearLevelName.replace(/\s+/g, '-') : 'First-Year'
                                })}?section=${encodeURIComponent(section)}&id-no=${user_id_no}`}
                            >
                                <Button className="text-blue-500 h-auto py-0" variant="link">
                                    COR
                                </Button>
                            </Link>
                        )}

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    onClick={() => openMoveStudentModal(student)}
                                    variant="icon"
                                    className="text-yellow-500 py-0 h-min"
                                >
                                    <MoveRightIcon className="h-4 w-4" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Move student</TooltipContent>
                        </Tooltip>
                        {forSchoolYear ? (
                            <></>
                        ) : (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        onClick={() => openUnenrollModal(id)}
                                        variant="icon"
                                        className="text-red-500 py-0 h-min"
                                    >
                                        <UserMinus className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>Unenroll student</TooltipContent>
                            </Tooltip>
                        )}
                    </div>
                );
            },
        },
    ];

    if (loading) return <PreLoader title="Students" />

    return (
        <div className='space-y-4'>
            <Head title='Students' />
            <PageTitle align="center">{courseName} - {yearlevel}{section}</PageTitle>
            <Card>
                <CardHeader>
                    {/* <CardTitle>Student List</CardTitle> */}
                </CardHeader>
                <CardContent>
                    <DataTable
                        searchBar={true}
                        columnsFilter={false}
                        columns={columns}
                        data={students}
                    />
                </CardContent>
            </Card>
            {studentToUnenroll && (
                <StudentActions
                    show={showModal}
                    setShowModal={setShowModal}
                    onCancel={() => setShowModal(false)}
                    onConfirm={handleUnenroll}
                    student={studentToUnenroll}
                />
            )}

            {/* Dialog Component (Outside of the Map Loop) */}
            <Dialog open={movingStudent} onOpenChange={setMovingStudent}>
                <DialogContent className="sm:max-w-[350px]">
                    <DialogHeader>
                        <DialogTitle>Move student</DialogTitle>
                        <DialogDescription>
                            {formatFullNameFML(studentToMove)}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="w-full max-w-sm h-72 overflow-auto">
                        <Table>
                            <TableBody>
                                {sections.map((sectionDetails) => (
                                    <TableRow key={sectionDetails.id} className="border-b group">
                                        <TableCell className="py-2">
                                            {sectionDetails.year_level_id}-{sectionDetails.section}
                                        </TableCell>
                                        <TableCell className="py-2 text-right hidden group-hover:table-cell">
                                            <Button
                                                disabled={processing || (sectionDetails.section == section && sectionDetails.year_level_id == yearlevel)}
                                                onClick={() => moveStudent(sectionDetails.id)}
                                                className="py-1 disabled:cursor-not-allowed"
                                            >
                                                Move
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    <DialogFooter>
                        <Button
                            className='w-full'
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setMovingStudent(false)
                                setstudentToMove({})
                            }}>
                            Cancel
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

EnrolledStudentList.layout = (page) => <AuthenticatedLayout>{page}</AuthenticatedLayout>;
